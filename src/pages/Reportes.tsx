import {
  BarChart3,
  ClipboardList,
  Database,
  Download,
  Eye,
  FileText,
  Filter,
  HardHat,
  ListChecks,
  Newspaper,
  Users,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../db/client';
import { pdf } from '@react-pdf/renderer';
import ReportPDF from '../components/ReportPDF';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { FormatSelector } from '../components/FormatSelector';
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
  todas: 'TODAS LAS FUENTES',
  visitas: 'VISITAS TÉCNICAS',
  tareas: 'TAREAS OPERATIVAS',
  personal: 'PERSONAL',
  novedades: 'NOVEDADES',
  diligenciamientos: 'DILIGENCIAMIENTOS',
};

const SORT_LABELS: Record<string, string> = {
  fecha_desc: 'MÁS RECIENTES PRIMERO',
  fecha_asc: 'MÁS ANTIGUOS PRIMERO',
  prioridad: 'PRIORIDAD OPERATIVA',
};

const SOURCE_ORDER = ['visitas', 'tareas', 'personal', 'novedades', 'diligenciamientos'];

const REPORT_COLUMNS: Record<string, ReportColumn[]> = {
  visitas: [
    { key: 'fecha', label: 'FECHA', priority: 'meta' },
    { key: 'hora', label: 'HORA', priority: 'meta' },
    { key: 'origen', label: 'ORIGEN', priority: 'primary' },
    { key: 'destino', label: 'DESTINO', priority: 'primary' },
    { key: 'responsable', label: 'RESPONSABLE' },
    { key: 'observaciones', label: 'OBSERVACIONES', priority: 'long' },
    { key: 'comentarios', label: 'COM.', priority: 'count' },
    { key: 'adjuntos', label: 'ADJ.', priority: 'count' },
  ],
  tareas: [
    { key: 'titulo', label: 'TAREA', priority: 'primary' },
    { key: 'prioridad', label: 'PRIORIDAD', priority: 'badge' },
    { key: 'estado', label: 'ESTADO', priority: 'badge' },
    { key: 'vencimiento', label: 'VENCIMIENTO', priority: 'meta' },
    { key: 'descripcion', label: 'DESCRIPCIÓN', priority: 'long' },
    { key: 'etiquetas', label: 'ETIQUETAS' },
    { key: 'subtareas', label: 'SUBTAREAS', priority: 'count' },
    { key: 'comentarios', label: 'COM.', priority: 'count' },
    { key: 'adjuntos', label: 'ADJ.', priority: 'count' },
    { key: 'recurrencia', label: 'RECURRENCIA' },
  ],
  personal: [
    { key: 'nombre', label: 'NOMBRE', priority: 'primary' },
    { key: 'rol', label: 'ROL / FUNCIÓN' },
    { key: 'estado', label: 'ESTADO', priority: 'badge' },
  ],
  novedades: [
    { key: 'fecha', label: 'FECHA', priority: 'meta' },
    { key: 'titulo', label: 'TÍTULO', priority: 'primary' },
    { key: 'autor', label: 'AUTOR' },
    { key: 'contenido', label: 'CONTENIDO', priority: 'long' },
    { key: 'adjuntos', label: 'ADJ.', priority: 'count' },
  ],
  diligenciamientos: [
    { key: 'fecha', label: 'FECHA', priority: 'meta' },
    { key: 'categoria', label: 'CATEGORÍA', priority: 'badge' },
    { key: 'titulo', label: 'TÍTULO', priority: 'primary' },
    { key: 'autor', label: 'AUTOR' },
    { key: 'detalle', label: 'DETALLE', priority: 'long' },
    { key: 'adjuntos', label: 'ADJ.', priority: 'count' },
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
  const raw = Array.isArray(value) ? value.join(', ') : String(value);
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).toUpperCase();
}

function arrayCount(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function formatDate(value: unknown, includeTime = false): string {
  const text = value === null || value === undefined || value === '' ? '' : String(value);
  if (!text) return '—';
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return safeText(text);
  return safeText(includeTime ? date.toLocaleString('es-ES') : date.toLocaleDateString('es-ES'));
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
      etiquetas: Array.isArray(row.tags) && row.tags.length ? safeText(row.tags.join(', ')) : '—',
      subtareas: subtasks.length ? `${completedSubtasks}/${subtasks.length}` : '0',
      comentarios: arrayCount(row.comments),
      adjuntos: arrayCount(row.attachments),
      recurrencia: safeText(row.recurrence, 'NONE'),
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

function getNonEmptyReportData(data: ReportData): ReportData {
  return Object.fromEntries(Object.entries(data).filter(([, records]) => records.length > 0));
}

function getReportTotal(data: ReportData): number {
  return Object.values(data).reduce((sum, records) => sum + records.length, 0);
}

export default function Reportes() {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'json'>('pdf');
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
    return Math.round((tasks.filter((task) => safeText(task.estado) === 'COMPLETADO').length / tasks.length) * 100);
  }, [dataPreview]);

  const periodLabel = `${dateFrom || 'SIN INICIO'} — ${dateTo || 'SIN FIN'}`;

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
        if (sortBy === 'prioridad') {
          const priorityOrder: Record<string, number> = { alta: 1, media: 2, baja: 3 };
          return (priorityOrder[String(a.priority || '').toLowerCase()] || 4) - (priorityOrder[String(b.priority || '').toLowerCase()] || 4);
        }

        const timeA = getRecordDate(a, source)?.getTime() || 0;
        const timeB = getRecordDate(b, source)?.getTime() || 0;
        return sortBy === 'fecha_asc' ? timeA - timeB : timeB - timeA;
      });

      const normalizedRows = filteredRows.map((row) => normalizeRecord(source, row));
      if (normalizedRows.length > 0) {
        reportData[source] = normalizedRows;
      }
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
      toast.error('ERROR AL CARGAR LA VISTA PREVIA');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const generatePDF = async (data: ReportData) => {
    const now = new Date().toLocaleString('es-ES');
    const dateStr = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const blob = await pdf(
      <ReportPDF
        data={data}
        now={now}
        dateStr={dateStr}
        filters={{ source: SOURCE_LABELS[dataSource] || dataSource, period: periodLabel, order: SORT_LABELS[sortBy] || sortBy }}
      />,
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_SGA_PZBP_${new Date().toISOString().split('T')[0]}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('PDF DESCARGADO CON ÉXITO', { id: 'report-gen' });
  };

  const generateExcel = (data: ReportData) => {
    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      ['REPORTE SGA PZBP'],
      ['GENERADO', safeText(new Date().toLocaleString('es-ES'))],
      ['FUENTE', SOURCE_LABELS[dataSource] || safeText(dataSource)],
      ['PERÍODO', periodLabel],
      ['ORDEN', SORT_LABELS[sortBy] || safeText(sortBy)],
      [],
      ['MÓDULO', 'REGISTROS'],
      ...Object.entries(data).map(([source, records]) => [SOURCE_LABELS[source] || safeText(source), records.length]),
      [],
      ['TOTAL', getReportTotal(data)],
      ['COMPLETITUD TAREAS', `${data.tareas?.length ? Math.round((data.tareas.filter((task) => safeText(task.estado) === 'COMPLETADO').length / data.tareas.length) * 100) : 0}%`],
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!cols'] = [{ wch: 28 }, { wch: 28 }];
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Resumen');

    Object.entries(data).forEach(([source, records]) => {
      const columns = REPORT_COLUMNS[source] || [];
      const worksheetRows = records.map((record) => {
        const row: Record<string, string | number | null | undefined> = {};
        columns.forEach((column) => {
          row[column.label] = record[column.key];
        });
        return row;
      });

      const worksheet = XLSX.utils.json_to_sheet(worksheetRows);
      worksheet['!cols'] = columns.map((column) => ({ wch: column.priority === 'long' ? 48 : column.priority === 'primary' ? 30 : 16 }));
      XLSX.utils.book_append_sheet(workbook, worksheet, SOURCE_LABELS[source].slice(0, 31));
    });

    XLSX.writeFile(workbook, `Reporte_SGA_PZBP_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('EXCEL DESCARGADO CON ÉXITO', { id: 'report-gen' });
  };

  const generateJSON = (data: ReportData) => {
    const payload = {
      metadata: {
        generatedAt: new Date().toISOString(),
        source: SOURCE_LABELS[dataSource] || safeText(dataSource),
        period: { from: dateFrom || null, to: dateTo || null },
        order: SORT_LABELS[sortBy] || safeText(sortBy),
        totalRecords: getReportTotal(data),
      },
      data,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Reporte_SGA_PZBP_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('JSON DESCARGADO CON ÉXITO', { id: 'report-gen' });
  };

  const handleGenerateReport = async () => {
    setIsGenerating(true);
    toast.loading('GENERANDO REPORTE...', { id: 'report-gen' });
    try {
      const data = getNonEmptyReportData(showPreview ? dataPreview : await fetchData());
      if (getReportTotal(data) === 0) {
        toast.error('NO HAY DATOS PARA EXPORTAR CON LOS FILTROS ACTUALES', { id: 'report-gen' });
        return;
      }
      if (format === 'pdf') await generatePDF(data);
      if (format === 'excel') generateExcel(data);
      if (format === 'json') generateJSON(data);
    } catch (error) {
      console.error(error);
      toast.error('ERROR AL GENERAR EL REPORTE', { id: 'report-gen' });
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
      <div className="mb-8 overflow-hidden border-4 border-[#1a1a1a] bg-[#f5f0e8] shadow-[10px_10px_0px_0px_rgba(26,26,26,1)]">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] bg-white">
          <div className="relative min-h-[220px] bg-[#0055ff] border-b-4 lg:border-b-0 lg:border-r-4 border-[#1a1a1a] flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[linear-gradient(135deg,#ffffff_0_8px,transparent_8px_22px)]" />
            <div className="relative bg-white border-4 border-[#1a1a1a] p-5 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)]">
              <img src="/pwa-192x192.png" alt="ICONO SGA PZBP" className="w-28 h-28 object-contain" />
            </div>
          </div>

          <div className="flex flex-col">
            <div className="bg-[#1a1a1a] text-white px-5 py-4 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8fb2ff] mb-1">CENTRO DE REPORTES · DISEÑO SGA ACTIVO</p>
                <h1 className="text-3xl sm:text-5xl font-black uppercase font-['Space_Grotesk'] tracking-tighter leading-none">REPORTE OPERATIVO</h1>
              </div>
              <div className="flex items-center gap-3 text-xs font-black uppercase border-2 border-white px-3 py-2">
                <BarChart3 className="w-5 h-5 text-[#8fb2ff]" />
                {showPreview ? `${totalRecords} REGISTROS LISTOS` : 'CONFIGURA Y PREVISUALIZA'}
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold uppercase bg-[#f5f0e8]">
              <div className="border-2 border-[#1a1a1a] bg-white p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"><span className="opacity-50 block text-[10px] font-black mb-1">FUENTE</span>{SOURCE_LABELS[dataSource] || dataSource}</div>
              <div className="border-2 border-[#1a1a1a] bg-white p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"><span className="opacity-50 block text-[10px] font-black mb-1">PERÍODO</span>{periodLabel}</div>
              <div className="border-2 border-[#1a1a1a] bg-white p-3 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]"><span className="opacity-50 block text-[10px] font-black mb-1">ORDEN</span>{SORT_LABELS[sortBy]}</div>
            </div>

            <div className="px-5 pb-5 bg-[#f5f0e8]">
              <div className="border-2 border-[#1a1a1a] bg-white p-4 font-black uppercase text-xs leading-relaxed">
                EL REPORTE USA EL ICONO DEL SISTEMA, EXPORTA EN UPPERCASE Y SOLO INCLUYE LOS MÓDULOS CON INFORMACIÓN REAL.
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        <aside className="bg-white border-2 border-[#1a1a1a] p-5 shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] h-fit xl:sticky xl:top-4">
          <div className="flex items-center gap-2 border-b-2 border-[#1a1a1a] pb-3 mb-5">
            <Filter className="w-5 h-5" />
            <h2 className="text-lg font-black uppercase font-['Space_Grotesk']">CONFIGURACIÓN</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">FUENTE DE DATOS</label>
              <select
                value={dataSource}
                onChange={(event) => {
                  setDataSource(event.target.value);
                  setShowPreview(false);
                }}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <option value="todas">TODAS LAS FUENTES</option>
                <option value="visitas">VISITAS TÉCNICAS</option>
                <option value="tareas">TAREAS OPERATIVAS</option>
                <option value="personal">PERSONAL</option>
                <option value="novedades">NOVEDADES</option>
                <option value="diligenciamientos">DILIGENCIAMIENTOS</option>
              </select>
            </div>

            {dataSource === 'diligenciamientos' && (
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-2">CATEGORÍA</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setShowPreview(false);
                  }}
                  className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
                >
                  <option value="todas">TODAS LAS CATEGORÍAS</option>
                  {availableCategories.map((category) => (
                    <option key={category.id || category.name} value={safeText(category.name)}>
                      {safeText(category.name)}
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
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">ORDENAMIENTO</label>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                  setShowPreview(false);
                }}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
              >
                <option value="fecha_desc">MÁS RECIENTES PRIMERO</option>
                <option value="fecha_asc">MÁS ANTIGUOS PRIMERO</option>
                <option value="prioridad">PRIORIDAD OPERATIVA</option>
              </select>
            </div>

            <FormatSelector value={format} onChange={setFormat} />

            <div className="grid grid-cols-1 gap-3 pt-2">
              <button
                onClick={loadPreview}
                disabled={isLoadingPreview}
                className="w-full py-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 text-xs sm:text-sm"
              >
                <Eye className="w-4 h-4" /> {isLoadingPreview ? 'CARGANDO...' : 'CARGAR VISTA PREVIA'}
              </button>
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full py-4 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <Download className="w-5 h-5" /> {isGenerating ? 'GENERANDO...' : 'DESCARGAR REPORTE'}
              </button>
            </div>
          </div>
        </aside>

        <main className="min-w-0">
          {showPreview ? (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="col-span-2 p-5 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb2ff] mb-2">RESUMEN</p>
                  <p className="text-4xl font-black font-['Space_Grotesk']">{totalRecords}</p>
                  <p className="text-xs font-bold uppercase opacity-70">REGISTROS NORMALIZADOS</p>
                </div>
                <div className="p-5 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">TAREAS</p>
                  <p className="text-3xl font-black font-['Space_Grotesk']">{taskCompletion}%</p>
                  <p className="text-xs font-bold uppercase opacity-60">COMPLETITUD</p>
                </div>
                <div className="p-5 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">FORMATO</p>
                  <p className="text-3xl font-black font-['Space_Grotesk'] uppercase">{format}</p>
                  <p className="text-xs font-bold uppercase opacity-60">SALIDA</p>
                </div>
              </section>

              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {Object.entries(dataCounts).map(([source, count]) => (
                  <div key={source} className={`p-4 border-2 border-[#1a1a1a] border-l-8 ${SOURCE_COLORS[source] || 'bg-white'} shadow-[3px_3px_0px_0px_rgba(26,26,26,1)]`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-white border-2 border-[#1a1a1a]">{sourceIcons[source] || <Database className="w-4 h-4" />}</div>
                      <span className="text-2xl font-black font-['Space_Grotesk']">{count}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{SOURCE_LABELS[source]}</p>
                  </div>
                ))}
              </section>

              {Object.entries(dataPreview).length === 0 && (
                <section className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-10 text-center">
                  <p className="text-sm font-black uppercase opacity-60">NO HAY DATOS PARA EXPORTAR CON LOS FILTROS ACTUALES.</p>
                  <p className="text-xs font-bold uppercase opacity-40 mt-2">PROBÁ CAMBIAR LA FUENTE, CATEGORÍA O RANGO DE FECHAS.</p>
                </section>
              )}

              {Object.entries(dataPreview).map(([source, records]) => {
                const columns = REPORT_COLUMNS[source] || [];
                const primaryColumns = columns.filter((column) => column.priority === 'primary' || column.priority === 'meta' || column.priority === 'badge').slice(0, 5);
                const detailColumns = columns.filter((column) => !primaryColumns.includes(column));

                return (
                  <section key={source} className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] overflow-hidden">
                    <div className="bg-[#1a1a1a] text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h2 className="text-sm sm:text-base font-black uppercase flex items-center gap-2 font-['Space_Grotesk']">
                        {sourceIcons[source] || <Database className="w-4 h-4" />}
                        {SOURCE_LABELS[source]}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#8fb2ff]">{records.length} REGISTROS</span>
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
                            MOSTRANDO 8 DE {records.length}. EL ARCHIVO DESCARGADO INCLUYE TODOS LOS REGISTROS.
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-10 text-center bg-[#f5f0e8]">
                        <p className="text-xs font-black uppercase opacity-50">SIN DATOS DISPONIBLES PARA LOS FILTROS ACTUALES</p>
                      </div>
                    )}
                  </section>
                );
              })}
            </motion.div>
          ) : (
            <div className="bg-[#f5f0e8] border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-8 sm:p-16 flex flex-col items-center justify-center text-center min-h-[520px]">
              <div className="p-5 border-2 border-[#1a1a1a] bg-white shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] mb-6">
                <FileText className="w-16 h-16 opacity-30" />
              </div>
              <h3 className="text-2xl font-black uppercase mb-3 font-['Space_Grotesk']">VISTA PREVIA PENDIENTE</h3>
              <p className="text-xs font-bold opacity-60 max-w-md mb-8 uppercase leading-relaxed">
                EL REPORTE USA EL DISEÑO DEL SISTEMA, NORMALIZA LOS DATOS EN UPPERCASE Y EXPORTA SOLO LOS MÓDULOS CON INFORMACIÓN.
              </p>
              <button
                onClick={loadPreview}
                disabled={isLoadingPreview}
                className="px-8 py-4 bg-[#0055ff] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm hover:bg-[#1a1a1a] transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50"
              >
                {isLoadingPreview ? 'CARGANDO...' : 'CARGAR VISTA PREVIA'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
