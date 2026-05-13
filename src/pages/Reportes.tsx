import {
  BarChart3,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  Filter,
  HardHat,
  ListChecks,
  Newspaper,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../db/client';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { DateRangePicker } from '../components/DateRangePicker';
import { getCategories } from '../db/diligenciamientos';

interface ReportColumn {
  key: string;
  label: string;
  priority?: 'primary' | 'meta' | 'long' | 'badge' | 'count';
}

type ReportRecord = Record<string, string | number | null | undefined>;

type ReportData = Record<string, ReportRecord[]>;

const SOURCE_LABELS: Record<string, string> = {
  todas: 'Todas las fuentes',
  visitas: 'Visitas técnicas',
  tareas: 'Tareas operativas',
  personal: 'Personal',
  novedades: 'Novedades',
  diligenciamientos: 'Diligenciamientos',
};

const SORT_LABELS: Record<string, string> = {
  fecha_desc: 'Más recientes primero',
  fecha_asc: 'Más antiguos primero',
  prioridad: 'Prioridad operativa',
};

const SOURCE_ORDER = ['visitas', 'tareas', 'personal', 'novedades', 'diligenciamientos'];

const REPORT_COLUMNS: Record<string, ReportColumn[]> = {
  visitas: [
    { key: 'fecha', label: 'Fecha', priority: 'meta' },
    { key: 'hora', label: 'Hora', priority: 'meta' },
    { key: 'origen', label: 'Origen', priority: 'primary' },
    { key: 'destino', label: 'Destino', priority: 'primary' },
    { key: 'responsable', label: 'Responsable' },
    { key: 'observaciones', label: 'Observaciones', priority: 'long' },
    { key: 'comentarios', label: 'Com.', priority: 'count' },
    { key: 'adjuntos', label: 'Adj.', priority: 'count' },
  ],
  tareas: [
    { key: 'titulo', label: 'Tarea', priority: 'primary' },
    { key: 'prioridad', label: 'Prioridad', priority: 'badge' },
    { key: 'estado', label: 'Estado', priority: 'badge' },
    { key: 'vencimiento', label: 'Vencimiento', priority: 'meta' },
    { key: 'descripcion', label: 'Descripción', priority: 'long' },
    { key: 'etiquetas', label: 'Etiquetas' },
    { key: 'subtareas', label: 'Subtareas', priority: 'count' },
    { key: 'comentarios', label: 'Com.', priority: 'count' },
    { key: 'adjuntos', label: 'Adj.', priority: 'count' },
    { key: 'recurrencia', label: 'Recurrencia' },
  ],
  personal: [
    { key: 'nombre', label: 'Nombre', priority: 'primary' },
    { key: 'rol', label: 'Rol / función' },
    { key: 'estado', label: 'Estado', priority: 'badge' },
  ],
  novedades: [
    { key: 'fecha', label: 'Fecha', priority: 'meta' },
    { key: 'titulo', label: 'Título', priority: 'primary' },
    { key: 'autor', label: 'Autor' },
    { key: 'contenido', label: 'Contenido', priority: 'long' },
    { key: 'adjuntos', label: 'Adj.', priority: 'count' },
  ],
  diligenciamientos: [
    { key: 'fecha', label: 'Fecha', priority: 'meta' },
    { key: 'categoria', label: 'Categoría', priority: 'badge' },
    { key: 'titulo', label: 'Título', priority: 'primary' },
    { key: 'autor', label: 'Autor' },
    { key: 'detalle', label: 'Detalle', priority: 'long' },
    { key: 'adjuntos', label: 'Adj.', priority: 'count' },
  ],
};

const SOURCE_COLORS: Record<string, string> = {
  visitas: 'border-[#00cc66] bg-[#f0fdf4]',
  tareas: 'border-[#0055ff] bg-[#eff6ff]',
  personal: 'border-[#8b5cf6] bg-[#f5f3ff]',
  novedades: 'border-[#ff9900] bg-[#fffbeb]',
  diligenciamientos: 'border-[#e63b2e] bg-[#fff1f2]',
};

function safeText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  if (Array.isArray(value)) return value.length ? value.join(', ') : fallback;
  return String(value).trim() || fallback;
}

function arrayCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function formatDate(value: unknown, includeTime = false): string {
  const text = safeText(value, '');
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return text;
  return includeTime ? date.toLocaleString('es-ES') : date.toLocaleDateString('es-ES');
}

function getRecordDate(row: Record<string, any>, source: string): Date | null {
  const value =
    source === 'tareas'
      ? row.due_date || row.dueDate || row.created_at || row.createdAt
      : row.fecha || row.created_at || row.createdAt;
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeRecord(source: string, row: Record<string, any>): ReportRecord {
  if (source === 'visitas') {
    return {
      fecha: formatDate(row.fecha),
      hora: safeText(row.hora),
      origen: safeText(row.origen),
      destino: safeText(row.destino),
      responsable: safeText(row.responsable),
      observaciones: safeText(row.observaciones),
      comentarios: arrayCount(row.comments),
      adjuntos: arrayCount(row.attachments),
    };
  }

  if (source === 'tareas') {
    const subtasks = Array.isArray(row.subtasks) ? row.subtasks : [];
    const completedSubtasks = subtasks.filter((item: any) => item?.completed).length;

    return {
      titulo: safeText(row.title),
      prioridad: safeText(row.priority),
      estado: safeText(row.status),
      vencimiento: formatDate(row.due_date || row.dueDate),
      descripcion: safeText(row.description),
      etiquetas: Array.isArray(row.tags) && row.tags.length ? row.tags.join(', ') : '—',
      subtareas: subtasks.length ? `${completedSubtasks}/${subtasks.length}` : '0',
      comentarios: arrayCount(row.comments),
      adjuntos: arrayCount(row.attachments),
      recurrencia: safeText(row.recurrence, 'none'),
    };
  }

  if (source === 'personal') {
    return {
      nombre: safeText(row.name),
      rol: safeText(row.role),
      estado: safeText(row.status),
    };
  }

  if (source === 'novedades') {
    return {
      fecha: formatDate(row.fecha || row.created_at),
      titulo: safeText(row.title),
      autor: safeText(row.author_name),
      contenido: safeText(row.content),
      adjuntos: arrayCount(row.attachments),
    };
  }

  if (source === 'diligenciamientos') {
    return {
      fecha: formatDate(row.fecha || row.created_at),
      categoria: safeText(row.category, 'OTROS'),
      titulo: safeText(row.title),
      autor: safeText(row.author_name),
      detalle: safeText(row.content),
      adjuntos: arrayCount(row.attachments),
    };
  }

  return row;
}

function truncate(value: unknown, maxLength = 120): string {
  const text = safeText(value);
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

export default function Reportes() {
  const [dataSource, setDataSource] = useState('todas');
  const [selectedCategory, setSelectedCategory] = useState('todas');
  const [availableCategories, setCategories] = useState<any[]>([]);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataPreview, setDataPreview] = useState<ReportData>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const sourceIcons: Record<string, React.ReactNode> = {
    visitas: <HardHat className="w-4 h-4" />,
    tareas: <ListChecks className="w-4 h-4" />,
    personal: <Users className="w-4 h-4" />,
    novedades: <Newspaper className="w-4 h-4" />,
    diligenciamientos: <ClipboardList className="w-4 h-4" />,
  };

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const selectedSources = useMemo(
    () => (dataSource === 'todas' ? SOURCE_ORDER : SOURCE_ORDER.filter((source) => source === dataSource)),
    [dataSource],
  );

  const dataCounts = useMemo(
    () => Object.fromEntries(Object.entries(dataPreview).map(([key, records]) => [key, records.length])),
    [dataPreview],
  );

  const totalRecords = useMemo(
    () => Object.values(dataCounts).reduce((sum, count) => sum + count, 0),
    [dataCounts],
  );

  const taskCompletion = useMemo(() => {
    const tasks = dataPreview.tareas || [];
    if (!tasks.length) return 0;
    return Math.round((tasks.filter((task) => task.estado === 'completado').length / tasks.length) * 100);
  }, [dataPreview]);

  const periodLabel = `${dateFrom || 'Sin inicio'} — ${dateTo || 'Sin fin'}`;

  const fetchData = async (): Promise<ReportData> => {
    const reportData: ReportData = {};

    for (const source of selectedSources) {
      let query = supabase.from(source === 'tareas' ? 'tasks' : source).select('*');

      if (source === 'diligenciamientos' && selectedCategory !== 'todas') {
        query = selectedCategory === 'OTROS' ? query.or('category.is.null,category.eq.OTROS') : query.eq('category', selectedCategory);
      }

      const { data: rows, error } = await query;
      if (error) throw error;

      let filteredRows = (rows || []) as Record<string, any>[];

      if (dateFrom || dateTo) {
        filteredRows = filteredRows.filter((row) => {
          const recordDate = getRecordDate(row, source);
          if (!recordDate) return true;
          if (dateFrom && recordDate < new Date(`${dateFrom}T00:00:00`)) return false;
          if (dateTo && recordDate > new Date(`${dateTo}T23:59:59`)) return false;
          return true;
        });
      }

      filteredRows.sort((a, b) => {
        if (sortBy.startsWith('titulo')) {
          const valA = String(a.title || a.name || '').toLowerCase();
          const valB = String(b.title || b.name || '').toLowerCase();
          return sortBy === 'titulo_az' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        }

        const timeA = getRecordDate(a, source)?.getTime() || 0;
        const timeB = getRecordDate(b, source)?.getTime() || 0;
        return sortBy === 'fecha_asc' ? timeA - timeB : timeB - timeA;
      });

      reportData[source] = filteredRows.map((row) => normalizeRecord(source, row));
    }

    return reportData;
  };

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const data = await fetchData();
      setDataPreview(data);
      setShowPreview(true);
    } catch (error) {
      console.error(error);
      toast.error('Error al cargar la vista previa');
    } finally {
      setIsLoadingPreview(false);
    }
  };


  const generateExcel = (data: ReportData) => {
    const workbook = XLSX.utils.book_new();

    // 1. Estructura de encabezado institucional (AoA - Array of Arrays)
    const headerRows = [
      ['SISTEMA DE GESTIÓN OPERATIVA - PNA PZBP'],
      ['REPORTE INSTITUCIONAL DE ACTIVIDADES'],
      [''],
      ['DATOS DEL REPORTE'],
      ['GENERADO POR', 'SISTEMA AUTOMATIZADO SGA'],
      ['FECHA/HORA', new Date().toLocaleString('es-ES').toUpperCase()],
      ['FUENTE DE DATOS', (SOURCE_LABELS[dataSource] || dataSource).toUpperCase()],
      ['PERÍODO', periodLabel.toUpperCase()],
      ['ORDENAMIENTO', (SORT_LABELS[sortBy] || sortBy).toUpperCase()],
      [''],
      ['DETALLE DE REGISTROS'],
    ];

    // 2. Procesar los registros para cada hoja
    Object.entries(data).forEach(([source, records]) => {
      if (!Array.isArray(records) || records.length === 0) return;

      const columns = REPORT_COLUMNS[source] || [];
      const headerMapping: Record<string, string> = {};
      columns.forEach(col => headerMapping[col.key] = col.label.toUpperCase());

      const dataToExport = records.map(record => {
        const row: Record<string, string> = {};
        columns.forEach(col => {
          row[headerMapping[col.key]] = String(record[col.key] || '—').toUpperCase();
        });
        return row;
      });

      // Crear la hoja con los datos empezando después del encabezado
      const worksheet = XLSX.utils.json_to_sheet(dataToExport, { origin: headerRows.length });
      
      // Inyectar el encabezado institucional al principio (A1)
      XLSX.utils.sheet_add_aoa(worksheet, headerRows, { origin: "A1" });

      // Configurar anchos de columna dinámicos basados en la prioridad definida
      worksheet['!cols'] = columns.map(col => ({
        wch: col.priority === 'long' ? 50 : col.priority === 'primary' ? 30 : 18
      }));

      // Congelar el encabezado institucional y de tabla (fila 11)
      worksheet['!view'] = [{ state: 'frozen', ySplit: 11 }];

      // Añadir pie de firma al final de la tabla
      const lastRowIdx = headerRows.length + dataToExport.length + 2;
      const footerRows = [
        [''],
        ['__________________________________', '', '__________________________________'],
        ['FIRMA DEL RESPONSABLE OPERATIVO', '', 'VALIDACIÓN TÉCNICA - SGA'],
        ['PNA - PREFECTURA NAVAL ARGENTINA', '', 'SGO-PZBP DIGITAL SYSTEM']
      ];
      XLSX.utils.sheet_add_aoa(worksheet, footerRows, { origin: `A${lastRowIdx}` });

      XLSX.utils.book_append_sheet(workbook, worksheet, SOURCE_LABELS[source].toUpperCase().slice(0, 31));
    });

    // 3. Descarga con nombre estandarizado
    const fileName = `REPORTE_SGA_${dataSource.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    toast.success('EXCEL INSTITUCIONAL GENERADO', { id: 'report-gen' });
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    try {
      const data = await fetchData();
      generateExcel(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  const renderBadgeClass = (value: unknown) => {
    const normalized = String(value || '').toLowerCase();
    if (['alta', 'inactivo', 'pendiente'].includes(normalized)) return 'bg-[#e63b2e] text-white';
    if (['media', 'en_proceso', 'mantenimiento'].includes(normalized)) return 'bg-[#0055ff] text-white';
    if (['baja', 'completado', 'activo', 'operativo'].includes(normalized)) return 'bg-[#00cc66] text-white';
    return 'bg-[#1a1a1a] text-white';
  };

  return (
    <div className="font-['Inter'] max-w-7xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      <div className="mb-6 overflow-hidden border-2 border-[#1a1a1a] bg-white shadow-[6px_6px_0px_0px_rgba(26,26,26,1)]">
        <div className="bg-[#1a1a1a] text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8fb2ff] mb-1">Centro de reportes</p>
            <h1 className="text-2xl sm:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Reporte operativo</h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-black uppercase">
            <BarChart3 className="w-5 h-5 text-[#8fb2ff]" />
            {showPreview ? `${totalRecords} registros listos` : 'Configura y previsualiza'}
          </div>
        </div>
        <div className="px-5 py-4 bg-[#f5f0e8] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold uppercase">
          <div><span className="opacity-50 block text-[10px] font-black">Fuente</span>{SOURCE_LABELS[dataSource] || dataSource}</div>
          <div><span className="opacity-50 block text-[10px] font-black">Período</span>{periodLabel}</div>
          <div><span className="opacity-50 block text-[10px] font-black">Orden</span>{SORT_LABELS[sortBy]}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-white border-2 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] h-fit xl:sticky xl:top-4">
          <div className="flex items-center gap-2 border-b-2 border-[#1a1a1a] pb-3 mb-5">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-black uppercase font-['Space_Grotesk']">Configuración</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Fuente de datos</label>
              <select
                value={dataSource}
                onChange={(event) => {
                  setDataSource(event.target.value);
                  setShowPreview(false);
                }}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <option value="todas">Todas las fuentes</option>
                <option value="visitas">Visitas técnicas</option>
                <option value="tareas">Tareas operativas</option>
                <option value="personal">Personal</option>
                <option value="novedades">Novedades</option>
                <option value="diligenciamientos">Diligenciamientos</option>
              </select>
            </div>

            {dataSource === 'diligenciamientos' && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Categoría</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setShowPreview(false);
                  }}
                  className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                >
                  <option value="todas">Todas las categorías</option>
                  {availableCategories.map((category) => (
                    <option key={category.id || category.name} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                  <option value="OTROS">OTROS</option>
                </select>
              </div>
            )}

            <DateRangePicker
              dateFrom={dateFrom}
              onDateFromChange={(value: string) => {
                setDateFrom(value);
                setShowPreview(false);
              }}
              dateTo={dateTo}
              onDateToChange={(value: string) => {
                setDateTo(value);
                setShowPreview(false);
              }}
            />

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Ordenamiento</label>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setShowPreview(false);
                }}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <option value="fecha_desc">Fecha (Descendente)</option>
                <option value="fecha_asc">Fecha (Ascendente)</option>
                <option value="titulo_az">Título (A-Z)</option>
                <option value="titulo_za">Título (Z-A)</option>
              </select>
            </div>

            <div className="pt-4 space-y-3">
              <button
                type="button"
                onClick={loadPreview}
                disabled={isLoadingPreview || isGenerating}
                className="w-full py-4 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#f5f0e8] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isLoadingPreview ? (
                  <div className="w-5 h-5 border-3 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Eye className="w-5 h-5" /> Vista previa
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={isGenerating || isLoadingPreview}
                className="w-full py-4 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-white hover:text-[#00cc66] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5" /> Descargar Excel
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {showPreview ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="col-span-2 p-5 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb2ff] mb-2">Resumen</p>
                  <p className="text-4xl font-black font-['Space_Grotesk']">{totalRecords}</p>
                  <p className="text-xs font-bold uppercase opacity-70">registros normalizados</p>
                </div>
                <div className="p-5 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Tareas</p>
                  <p className="text-3xl font-black font-['Space_Grotesk']">{taskCompletion}%</p>
                  <p className="text-xs font-bold uppercase opacity-60">completitud</p>
                </div>
                <div className="p-5 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Estado</p>
                  <p className="text-3xl font-black font-['Space_Grotesk'] uppercase">LISTO</p>
                  <p className="text-xs font-bold uppercase opacity-60">Para descarga</p>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {Object.entries(dataCounts).map(([source, count]) => (
                  <div key={source} className={`p-4 border-2 border-[#1a1a1a] border-l-8 ${SOURCE_COLORS[source] || 'bg-white'} shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-white border-2 border-[#1a1a1a]">{sourceIcons[source] || <ClipboardList className="w-4 h-4" />}</div>
                      <span className="text-2xl font-black font-['Space_Grotesk']">{count}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{SOURCE_LABELS[source]}</p>
                  </div>
                ))}
              </section>

              {Object.entries(dataPreview).map(([source, records]) => {
                const columns = REPORT_COLUMNS[source] || [];
                const primaryColumns = columns.filter((column) => column.priority === 'primary' || column.priority === 'meta' || column.priority === 'badge').slice(0, 5);
                const detailColumns = columns.filter((column) => !primaryColumns.includes(column));

                return (
                  <section key={source} className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
                    <div className="bg-[#1a1a1a] text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h2 className="text-sm sm:text-base font-black uppercase flex items-center gap-2 font-['Space_Grotesk']">
                        {sourceIcons[source] || <ClipboardList className="w-4 h-4" />}
                        {SOURCE_LABELS[source]}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#8fb2ff]">{records.length} registros</span>
                    </div>

                    {records.length > 0 ? (
                      <div className="divide-y-2 divide-[#1a1a1a]">
                        {records.slice(0, 8).map((record, index) => (
                          <article key={`${source}-${index}`} className="p-4 hover:bg-[#f5f0e8] transition-colors">
                            <div className="grid grid-cols-1 lg:grid-cols-[1fr_260px] gap-4">
                              <div>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                                  {primaryColumns.map((column) => (
                                    <div key={column.key}>
                                      <p className="text-[9px] font-black uppercase tracking-widest opacity-45 mb-1">{column.label}</p>
                                      {column.priority === 'badge' ? (
                                        <span className={`inline-flex px-2 py-1 border-2 border-[#1a1a1a] text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(26,26,26,1)] ${renderBadgeClass(record[column.key])}`}>
                                          {safeText(record[column.key]).replace('_', ' ')}
                                        </span>
                                      ) : (
                                        <p className="text-sm font-black uppercase leading-tight">{truncate(record[column.key], 70)}</p>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2 content-start">
                                {detailColumns.map((column) => (
                                  <div key={column.key} className={`${column.priority === 'long' ? 'col-span-2' : ''} border-2 border-[#1a1a1a]/20 bg-[#f5f0e8] p-2`}>
                                    <p className="text-[9px] font-black uppercase tracking-widest opacity-45 mb-1">{column.label}</p>
                                    <p className="text-xs font-bold uppercase leading-snug">{truncate(record[column.key], column.priority === 'long' ? 160 : 36)}</p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </article>
                        ))}
                        {records.length > 8 && (
                          <div className="p-3 text-center text-[10px] font-black uppercase tracking-widest opacity-60 bg-[#f5f0e8]">
                            Mostrando 8 de {records.length}. El archivo descargado incluye todos los registros.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-[#f5f0e8]">
                        <p className="text-xs font-black uppercase opacity-50">Sin datos disponibles para los filtros actuales</p>
                      </div>
                    )}
                  </section>
                );
              })}
            </motion.div>
          ) : (
            <div className="bg-[#f5f0e8] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-8 sm:p-16 flex flex-col items-center justify-center text-center min-h-[520px]">
              <div className="p-5 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] mb-6">
                <FileSpreadsheet className="w-16 h-16 opacity-30 text-[#00cc66]" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-3 font-['Space_Grotesk']">Vista previa pendiente</h3>
              <p className="text-xs font-bold opacity-60 max-w-md mb-8 uppercase leading-relaxed">
                El reporte ahora ordena los datos por módulo y normaliza nombres, fechas, estados y conteos. Carga la vista previa para revisar cómo quedará antes de descargarlo.
              </p>
              <button
                onClick={loadPreview}
                disabled={isLoadingPreview}
                className="px-8 py-4 bg-[#0055ff] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm hover:bg-[#1a1a1a] transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                {isLoadingPreview ? 'Cargando...' : 'Cargar vista previa'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
