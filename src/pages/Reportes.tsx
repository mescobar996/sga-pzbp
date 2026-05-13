import { FileSpreadsheet, Download, Database, Eye, BarChart3, Users, HardHat, ListChecks, Newspaper, ClipboardList, Filter } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { supabase } from '../db/client';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { DateRangePicker } from '../components/DateRangePicker';
import { getCategories } from '../db/diligenciamientos';

export default function Reportes() {
  const [dataSource, setDataSource] = useState('todas');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [availableCategories, setCategories] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataPreview, setDataPreview] = useState<Record<string, any[]>>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    getCategories().then(data => {
      setCategories(data);
    });
  }, []);

  const fetchData = async () => {
    const data: Record<string, any[]> = {};

    const fetchCollection = async (colName: string, categoryFilter?: string) => {
      let query = supabase.from(colName).select('*');
      
      if (colName === 'diligenciamientos' && categoryFilter && categoryFilter !== 'todas') {
        if (categoryFilter === 'OTROS') {
          query = query.or('category.is.null,category.eq.OTROS');
        } else {
          query = query.eq('category', categoryFilter);
        }
      }

      const { data: docs, error } = await query;
      if (error) throw error;
      let result = docs || [];

      if (dateFrom || dateTo) {
        result = result.filter((doc: any) => {
          const docDate = doc.created_at ? new Date(doc.created_at) : doc.fecha ? new Date(doc.fecha) : null;
          if (!docDate) return true;
          if (dateFrom && new Date(dateFrom + 'T00:00:00') > docDate) return false;
          if (dateTo && new Date(dateTo + 'T23:59:59') < docDate) return false;
          return true;
        });
      }

      if (sortBy === 'fecha_desc') {
        result.sort((a: any, b: any) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : a.fecha ? new Date(a.fecha).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : b.fecha ? new Date(b.fecha).getTime() : 0;
          return dateB - dateA;
        });
      } else if (sortBy === 'fecha_asc') {
        result.sort((a: any, b: any) => {
          const dateA = a.created_at ? new Date(a.created_at).getTime() : a.fecha ? new Date(a.fecha).getTime() : 0;
          const dateB = b.created_at ? new Date(b.created_at).getTime() : b.fecha ? new Date(b.fecha).getTime() : 0;
          return dateA - dateB;
        });
      } else if (sortBy === 'prioridad') {
        const priorityOrder: Record<string, number> = { alta: 1, media: 2, baja: 3 };
        result.sort((a: any, b: any) => {
          const pA = priorityOrder[a.priority?.toLowerCase()] || 4;
          const pB = priorityOrder[b.priority?.toLowerCase()] || 4;
          return pA - pB;
        });
      }

      return result;
    };

    if (dataSource === 'todas' || dataSource === 'visitas') data.visitas = await fetchCollection('visitas');
    if (dataSource === 'todas' || dataSource === 'tareas') data.tareas = await fetchCollection('tasks');
    if (dataSource === 'todas' || dataSource === 'personal') data.personal = await fetchCollection('personal');
    if (dataSource === 'todas' || dataSource === 'novedades') data.novedades = await fetchCollection('novedades');
    if (dataSource === 'todas' || dataSource === 'diligenciamientos') {
      data.diligenciamientos = await fetchCollection('diligenciamientos', selectedCategory);
    }

    return data;
  };

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const data = await fetchData();
      setDataPreview(data);
      setShowPreview(true);
    } catch (error) {
      toast.error('ERROR AL CARGAR LA VISTA PREVIA');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const generateExcel = (data: Record<string, any[]>) => {
    const workbook = XLSX.utils.book_new();

    const sheetConfigs: Record<
      string,
      { columns: { key: string; header: string }[] }
    > = {
      visitas: {
        columns: [
          { key: 'fecha', header: 'FECHA' },
          { key: 'hora', header: 'HORA' },
          { key: 'origen', header: 'ORIGEN' },
          { key: 'destino', header: 'DESTINO' },
          { key: 'responsable', header: 'RESPONSABLE' },
          { key: 'observaciones', header: 'OBSERVACIONES' },
        ],
      },
      tareas: {
        columns: [
          { key: 'title', header: 'TÍTULO' },
          { key: 'priority', header: 'PRIORIDAD' },
          { key: 'status', header: 'ESTADO' },
          { key: 'dueDate', header: 'VENCIMIENTO' },
          { key: 'description', header: 'DESCRIPCIÓN' },
          { key: 'recurrence', header: 'RECURRENCIA' },
        ],
      },
      personal: {
        columns: [
          { key: 'name', header: 'NOMBRE' },
          { key: 'role', header: 'ROL' },
          { key: 'status', header: 'ESTADO' },
        ],
      },
      novedades: {
        columns: [
          { key: 'createdAt', header: 'FECHA/HORA' },
          { key: 'title', header: 'TÍTULO' },
          { key: 'authorName', header: 'AUTOR' },
          { key: 'content', header: 'CONTENIDO' },
        ],
      },
      diligenciamientos: {
        columns: [
          { key: 'fecha', header: 'FECHA' },
          { key: 'category', header: 'CATEGORÍA' },
          { key: 'title', header: 'TÍTULO' },
          { key: 'authorName', header: 'AUTOR' },
          { key: 'content', header: 'CONTENIDO' },
        ],
      },
    };

    const sheetLabels: Record<string, string> = {
      visitas: 'VISITAS TÉCNICAS',
      tareas: 'TAREAS OPERATIVAS',
      personal: 'PERSONAL ACTIVO',
      novedades: 'NOVEDADES',
      diligenciamientos: 'DILIGENCIAMIENTOS',
    };

    const totalVisitas = data.visitas?.length || 0;
    const totalTareas = data.tareas?.length || 0;
    const totalPersonal = data.personal?.length || 0;
    const totalNovedades = data.novedades?.length || 0;
    const totalDiligenciamientos = data.diligenciamientos?.length || 0;
    const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades + totalDiligenciamientos;

    const resumenData = [
      { A: 'REPORTE SGA PZBP — PREFECTURA NAVAL ARGENTINA' },
      {},
      { A: 'RESUMEN GENERAL' },
      { A: 'FECHA DE GENERACIÓN:', B: new Date().toLocaleString('es-AR').toUpperCase() },
      { A: 'FILTRO DE DATOS:', B: (dataSource === 'todas' ? 'TODAS LAS FUENTES' : (sheetLabels[dataSource] || dataSource)).toUpperCase() },
      { A: 'PERÍODO:', B: `${(dateFrom || 'SIN LÍMITE').toUpperCase()} — ${(dateTo || 'SIN LÍMITE').toUpperCase()}` },
      {},
      { A: 'ESTADÍSTICAS POR MÓDULO' },
      { A: 'VISITAS TÉCNICAS', B: totalVisitas },
      { A: 'TAREAS OPERATIVAS', B: totalTareas },
      { A: 'PERSONAL ACTIVO', B: totalPersonal },
      { A: 'NOVEDADES', B: totalNovedades },
      { A: 'DILIGENCIAMIENTOS', B: totalDiligenciamientos },
      {},
      { A: 'TOTAL REGISTROS:', B: totalRecords },
    ];

    const resumenWs = XLSX.utils.json_to_sheet(resumenData, { skipHeader: true });
    resumenWs['!cols'] = [{ wch: 30 }, { wch: 45 }];
    XLSX.utils.book_append_sheet(workbook, resumenWs, 'RESUMEN');

    Object.keys(data).forEach((key) => {
      const records = data[key];
      const config = sheetConfigs[key];
      if (!config || records.length === 0) return;

      const worksheetData: any[] = [];
      
      const headerRow: Record<string, string> = {};
      config.columns.forEach((col, idx) => {
        headerRow[String.fromCharCode(65 + idx)] = col.header.toUpperCase();
      });
      worksheetData.push(headerRow);

      records.forEach((record) => {
        const row: Record<string, any> = {};
        config.columns.forEach((col, idx) => {
          const cellRef = String.fromCharCode(65 + idx);
          let val = record[col.key];
          
          if (val === null || val === undefined) val = '';
          
          if (col.key === 'createdAt' || col.key === 'timestamp' || col.key === 'fecha' || col.key === 'dueDate') {
            try {
              const d = new Date(val);
              if (!isNaN(d.getTime())) val = d.toLocaleString('es-AR');
            } catch { /* ... */ }
          }
          
          row[cellRef] = String(val).toUpperCase().trim();
        });
        worksheetData.push(row);
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });

      const colWidths = config.columns.map((col, idx) => {
        const cellRef = String.fromCharCode(65 + idx);
        const maxLen = Math.max(
          col.header.length,
          ...worksheetData.map(row => String(row[cellRef] || '').length)
        );
        return { wch: Math.min(maxLen + 4, 80) };
      });

      worksheet['!cols'] = colWidths;
      worksheet['!autofilter'] = {
        ref: `A1:${String.fromCharCode(64 + config.columns.length)}${worksheetData.length}`,
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetLabels[key] || key.toUpperCase());
    });

    XLSX.writeFile(workbook, `REPORTE_SGA_PZBP_${new Date().toISOString().split('T')[0]}.XLSX`);
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    toast.loading('GENERANDO EXCEL...', { id: 'report-gen' });

    try {
      const data = await fetchData();

      let hasData = false;
      Object.values(data).forEach((arr) => {
        if (arr.length > 0) hasData = true;
      });

      if (!hasData) {
        toast.error('NO HAY DATOS PARA LOS FILTROS SELECCIONADOS', { id: 'report-gen' });
        setIsGenerating(false);
        return;
      }

      generateExcel(data);
      toast.success('EXCEL GENERADO CON ÉXITO', { id: 'report-gen' });
    } catch (error) {
      console.error(error);
      toast.error('ERROR AL GENERAR EL REPORTE', { id: 'report-gen' });
    } finally {
      setIsGenerating(false);
    }
  };

  const dataCounts = Object.entries(dataPreview).reduce(
    (acc, [key, value]) => {
      acc[key] = value.length;
      return acc;
    },
    {} as Record<string, number>,
  );

  const totalRecords = Object.values(dataCounts).reduce((a, b) => a + b, 0);

  const sourceIcons: Record<string, React.ReactNode> = {
    visitas: <HardHat className="w-4 h-4" />,
    tareas: <ListChecks className="w-4 h-4" />,
    personal: <Users className="w-4 h-4" />,
    novedades: <Newspaper className="w-4 h-4" />,
    diligenciamientos: <ClipboardList className="w-4 h-4" />,
  };

  const sourceLabels: Record<string, string> = {
    visitas: 'VISITAS TÉCNICAS',
    tareas: 'TAREAS OPERATIVAS',
    personal: 'PERSONAL ACTIVO',
    novedades: 'NOVEDADES',
    diligenciamientos: 'DILIGENCIAMIENTOS',
  };

  const formatValue = (val: any, key: string): string => {
    if (val === null || val === undefined) return '';
    let result = '';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        if (val.length === 0) return '';
        if (key === 'comments') result = `${val.length} COMENTARIO${val.length > 1 ? 'S' : ''}`;
        else if (key === 'subtasks') {
          const done = val.filter((s: any) => s.completed).length;
          result = `${done}/${val.length}`;
        }
        else if (key === 'attachments' || key === 'tags') result = `${val.length}`;
        else result = `${val.length} ELEMENTO(S)`;
      } else if (key === 'createdAt' || key === 'timestamp') {
        try {
          result = new Date(val).toLocaleString('es-ES');
        } catch {
          result = String(val);
        }
      } else {
        result = JSON.stringify(val);
      }
    } else if (key === 'createdAt' || key === 'timestamp' || key === 'fecha' || key === 'dueDate') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) result = d.toLocaleString('es-ES');
        else result = String(val);
      } catch {
        result = String(val);
      }
    } else {
      result = String(val);
    }
    return result.toUpperCase();
  };

  const getColumnConfig = (key: string): { field: string; label: string; width: string }[] => {
    const configs: Record<string, { field: string; label: string; width: string }[]> = {
      visitas: [
        { field: 'fecha', label: 'FECHA', width: 'w-24' },
        { field: 'hora', label: 'HORA', width: 'w-16' },
        { field: 'origen', label: 'ORIGEN', width: 'min-w-[100px]' },
        { field: 'destino', label: 'DESTINO', width: 'min-w-[100px]' },
        { field: 'responsable', label: 'RESPONSABLE', width: 'min-w-[120px]' },
        { field: 'observaciones', label: 'OBSERVACIONES', width: 'min-w-[180px]' },
      ],
      tareas: [
        { field: 'title', label: 'TÍTULO', width: 'min-w-[150px]' },
        { field: 'priority', label: 'PRIORIDAD', width: 'w-20' },
        { field: 'status', label: 'ESTADO', width: 'w-24' },
        { field: 'dueDate', label: 'VENCIMIENTO', width: 'w-24' },
        { field: 'description', label: 'DESCRIPCIÓN', width: 'min-w-[180px]' },
      ],
      personal: [
        { field: 'name', label: 'NOMBRE', width: 'min-w-[150px]' },
        { field: 'role', label: 'ROL', width: 'w-40' },
        { field: 'status', label: 'ESTADO', width: 'w-28' },
      ],
      novedades: [
        { field: 'createdAt', label: 'FECHA', width: 'w-32' },
        { field: 'title', label: 'TÍTULO', width: 'min-w-[150px]' },
        { field: 'authorName', label: 'AUTOR', width: 'w-36' },
        { field: 'content', label: 'CONTENIDO', width: 'min-w-[220px]' },
      ],
      diligenciamientos: [
        { field: 'fecha', label: 'FECHA', width: 'w-32' },
        { field: 'title', label: 'TÍTULO', width: 'min-w-[150px]' },
        { field: 'authorName', label: 'AUTOR', width: 'w-36' },
        { field: 'content', label: 'DETALLE', width: 'min-w-[220px]' },
      ],
    };
    return configs[key] || [];
  };

  const getPriorityBadge = (val: string) => {
    if (val === 'alta') return 'bg-[#e63b2e] text-white';
    if (val === 'media') return 'bg-[#0055ff] text-white';
    if (val === 'baja') return 'bg-[#00cc66] text-white';
    return 'bg-gray-200 text-[#1a1a1a]';
  };

  const getStatusBadge = (val: string) => {
    if (val === 'completado' || val === 'Activo' || val === 'Operativo') return 'bg-[#00cc66] text-white';
    if (val === 'pendiente' || val === 'en_proceso' || val === 'Mantenimiento') return 'bg-[#0055ff] text-white';
    if (val === 'eliminado' || val === 'Inactivo') return 'bg-[#e63b2e] text-white';
    return 'bg-gray-200 text-[#1a1a1a]';
  };

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
          CENTRO DE REPORTES EXCEL
        </h1>
        {totalRecords > 0 && showPreview && (
          <div className="flex items-center gap-2 bg-[#1a1a1a] text-white px-4 py-2 border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
            <BarChart3 className="w-5 h-5 text-[#00cc66]" />
            <span className="text-sm font-black uppercase">{totalRecords} REGISTROS CARGADOS</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 bg-[#f5f0e8] border-2 border-[#1a1a1a] p-6 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] h-fit">
          <h2 className="text-lg font-black uppercase mb-6 font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-2">
            FILTROS DE EXPORTACIÓN
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Database className="w-3.5 h-3.5" /> ORIGEN DE DATOS
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-white focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <option value="todas">TODAS LAS FUENTES</option>
                <option value="visitas">VISITAS TÉCNICAS</option>
                <option value="tareas">TAREAS OPERATIVAS</option>
                <option value="personal">PERSONAL ACTIVO</option>
                <option value="novedades">NOVEDADES</option>
                <option value="diligenciamientos">DILIGENCIAMIENTOS</option>
              </select>
            </div>

            {dataSource === 'diligenciamientos' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="overflow-hidden"
              >
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                  <Filter className="w-3.5 h-3.5 text-[#0055ff]" /> FILTRAR POR MÓDULO
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-3 border-2 border-[#1a1a1a] bg-white focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                >
                  <option value="todas">TODOS LOS MÓDULOS</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                  <option value="OTROS">OTROS (SIN CATEGORÍA)</option>
                </select>
              </motion.div>
            )}

            <DateRangePicker
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
            />

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">ORDENAR POR</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-white focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <option value="fecha_desc">FECHA (MÁS RECIENTE)</option>
                <option value="fecha_asc">FECHA (MÁS ANTIGUO)</option>
                <option value="prioridad">PRIORIDAD (ALTA A BAJA)</option>
              </select>
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full py-4 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-white hover:text-[#00cc66] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              <FileSpreadsheet className="w-6 h-6" /> {isGenerating ? 'PROCESANDO...' : 'DESCARGAR EXCEL'}
            </button>

            <button
              onClick={loadPreview}
              disabled={isLoadingPreview}
              className="w-full py-3 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#f5f0e8] transition-all flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 text-xs sm:text-sm"
            >
              <Eye className="w-4 h-4" /> {isLoadingPreview ? 'CARGANDO...' : 'VER VISTA PREVIA'}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          {showPreview ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-6"
            >
              <h2 className="text-lg font-black uppercase mb-6 font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-2">
                VISTA PREVIA DE DATOS (MAYÚSCULAS)
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {Object.entries(dataCounts).map(([key, count]) => (
                  <div key={key} className="p-4 border-2 border-[#1a1a1a] bg-[#f5f0e8] flex flex-col gap-2 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                    <div className="p-2 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] w-fit">
                      {sourceIcons[key] || <Database className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase opacity-60 leading-tight mb-1">{key.toUpperCase()}</p>
                      <p className="text-2xl font-black font-['Space_Grotesk']">{count}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-10 max-h-[700px] overflow-y-auto pr-3 custom-scrollbar">
                {Object.entries(dataPreview).map(([key, records]) => {
                  const columns = getColumnConfig(key);
                  const hasColumns = columns.length > 0;

                  return (
                    <div key={key} className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-black uppercase flex items-center gap-2 bg-[#f5f0e8] border-2 border-[#1a1a1a] px-3 py-1 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
                          {sourceIcons[key] || <Database className="w-4 h-4" />}
                          {sourceLabels[key] || key.toUpperCase()}
                        </h3>
                        <span className="text-[10px] font-black uppercase bg-[#1a1a1a] text-white px-2 py-0.5 border-2 border-[#1a1a1a]">
                          {records.length} REGISTROS
                        </span>
                      </div>

                      {records.length > 0 ? (
                        <div className="overflow-x-auto border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]">
                          {hasColumns ? (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#1a1a1a] text-white">
                                  <th className="p-3 text-[10px] font-black uppercase tracking-widest w-10 border-r border-white/20">#</th>
                                  {columns.map((col) => (
                                    <th
                                      key={col.field}
                                      className={`p-3 text-[10px] font-black uppercase tracking-widest border-r border-white/20 last:border-r-0 ${col.width}`}
                                    >
                                      {col.label}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {records.slice(0, 10).map((record, idx) => (
                                  <tr
                                    key={idx}
                                    className={`border-t-2 border-[#1a1a1a] ${idx % 2 === 0 ? 'bg-[#f5f0e8]' : 'bg-white'} hover:bg-[#00cc66]/10 transition-colors`}
                                  >
                                    <td className="p-3 text-[10px] font-black border-r border-[#1a1a1a] text-center">{idx + 1}</td>
                                    {columns.map((col) => {
                                      const rawVal = record[col.field];
                                      const displayVal = formatValue(rawVal, col.field);
                                      const isBadge = col.field === 'priority' || col.field === 'status';

                                      return (
                                        <td key={col.field} className="p-3 uppercase border-r border-[#1a1a1a] last:border-r-0">
                                          {isBadge && typeof rawVal === 'string' && rawVal ? (
                                            <span
                                              className={`inline-block px-2 py-0.5 text-[9px] font-black uppercase tracking-tighter border-2 border-[#1a1a1a] shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] ${col.field === 'priority' ? getPriorityBadge(rawVal) : getStatusBadge(rawVal)}`}
                                            >
                                              {rawVal.toUpperCase().replace('_', ' ')}
                                            </span>
                                          ) : (
                                            <span
                                              className="text-xs font-bold uppercase truncate block max-w-[250px]"
                                              title={String(rawVal ?? '')}
                                            >
                                              {displayVal || '—'}
                                            </span>
                                          )}
                                        </td>
                                      );
                                    })}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          ) : (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#1a1a1a] text-white">
                                  <th className="p-3 text-[10px] font-black uppercase tracking-widest w-10 border-r border-white/20">#</th>
                                  {Object.keys(records[0])
                                    .slice(0, 6)
                                    .map((header) => (
                                      <th
                                        key={header}
                                        className="p-3 text-[10px] font-black uppercase tracking-widest border-r border-white/20 last:border-r-0 min-w-[100px]"
                                      >
                                        {header.toUpperCase()}
                                      </th>
                                    ))}
                                </tr>
                              </thead>
                              <tbody>
                                {records.slice(0, 10).map((record, idx) => (
                                  <tr
                                    key={idx}
                                    className={`border-t-2 border-[#1a1a1a] ${idx % 2 === 0 ? 'bg-[#f5f0e8]' : 'bg-white'}`}
                                  >
                                    <td className="p-3 text-[10px] font-black border-r border-[#1a1a1a] text-center">{idx + 1}</td>
                                    {Object.values(record)
                                      .slice(0, 6)
                                      .map((val: any, i) => (
                                        <td
                                          key={i}
                                          className="p-3 text-[10px] font-black uppercase truncate max-w-[200px] border-r border-[#1a1a1a] last:border-r-0"
                                          title={String(val ?? '')}
                                        >
                                          {formatValue(val, Object.keys(record)[i])}
                                        </td>
                                      ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}
                          {records.length > 10 && (
                            <div className="p-3 text-center text-[10px] font-black uppercase tracking-widest opacity-60 border-t-2 border-[#1a1a1a] bg-[#f5f0e8]">
                              MOSTRANDO 10 DE {records.length} REGISTROS
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-10 text-center border-4 border-dashed border-[#1a1a1a]/20 bg-[#f5f0e8]/50">
                           <p className="text-xs font-black uppercase opacity-40">SIN DATOS DISPONIBLES</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <div className="bg-[#f5f0e8] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-16 flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-20 h-20 mb-6 opacity-20" />
              <h3 className="text-2xl font-black uppercase mb-3 font-['Space_Grotesk']">SIN VISTA PREVIA</h3>
              <p className="text-xs font-bold opacity-60 max-w-sm mb-8 uppercase leading-relaxed">
                CONFIGURA LOS FILTROS Y HAZ CLIC EN "VER VISTA PREVIA" PARA ANALIZAR LOS DATOS ANTES DE GENERAR EL REPORTE FINAL.
              </p>
              <button
                onClick={loadPreview}
                className="px-8 py-4 bg-[#00cc66] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm hover:bg-[#1a1a1a] transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                CARGAR VISTA PREVIA
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
