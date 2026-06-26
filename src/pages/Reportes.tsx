import {
  BarChart3,
  ClipboardList,
  Eye,
  FileSpreadsheet,
  FileText,
  Filter,
  HardHat,
  ListChecks,
  Newspaper,
  Users,
  AlertTriangle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase, getCurrentUserEmail } from '../db/client';
import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
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
    { key: 'responsable', label: 'Responsable' },
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

const STATUS_OPTIONS = [
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'en_proceso', label: 'En Proceso' },
  { value: 'completado', label: 'Completado' },
  { value: 'activo', label: 'Activo' },
  { value: 'inactivo', label: 'Inactivo' },
];

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
  if (!text || text === '—') return '—';
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
      responsable: safeText(row.assigned_to || row.assignedTo),
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

function uppercaseRecord(record: ReportRecord): ReportRecord {
  const newRecord: ReportRecord = {};
  for (const [key, val] of Object.entries(record)) {
    const lowerKey = key.toLowerCase();
    if (
      typeof val === 'string' &&
      lowerKey !== 'id' &&
      !lowerKey.endsWith('_id') &&
      lowerKey !== 'uuid' &&
      lowerKey !== 'estado' &&
      lowerKey !== 'status' &&
      lowerKey !== 'priority' &&
      lowerKey !== 'prioridad' &&
      lowerKey !== 'recurrence' &&
      lowerKey !== 'recurrencia'
    ) {
      newRecord[key] = val.toUpperCase();
    } else {
      newRecord[key] = val;
    }
  }
  return newRecord;
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

  // Nuevos estados para multiselectores
  const [selectedResponsibles, setSelectedResponsibles] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [availableResponsibles, setAvailableResponsibles] = useState<string[]>([]);
  const [responsibleSearch, setResponsibleSearch] = useState('');
  const [paperSize, setPaperSize] = useState('a4');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

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

  // Carga unificada de responsables disponibles para filtro
  useEffect(() => {
    const loadResponsibles = async () => {
      try {
        const namesSet = new Set<string>();

        // 1. Fetch de tabla users
        const { data: usersData } = await supabase.from('users').select('name');
        usersData?.forEach((u) => {
          if (u.name) namesSet.add(u.name.toUpperCase().trim());
        });

        // 2. Fetch de tabla personal
        const { data: personalData } = await supabase.from('personal').select('name');
        personalData?.forEach((p) => {
          if (p.name) namesSet.add(p.name.toUpperCase().trim());
        });

        // 3. Fetch de tabla visitas (campo responsable)
        const { data: visitasData } = await supabase.from('visitas').select('responsable');
        visitasData?.forEach((v) => {
          if (v.responsable) {
            const parts = v.responsable.split(/ Y |, | y /i);
            parts.forEach((p: string) => {
              const name = p.trim();
              if (name) namesSet.add(name.toUpperCase());
            });
          }
        });

        setAvailableResponsibles(Array.from(namesSet).sort());
      } catch (err) {
        console.error('Error loading available responsibles list:', err);
      }
    };

    loadResponsibles();
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

      // 1. Filtrado por fecha
      if (dateFrom || dateTo) {
        filteredRows = filteredRows.filter((row) => {
          const recordDate = getRecordDate(row, source);
          if (!recordDate) return true;
          if (dateFrom && recordDate < new Date(`${dateFrom}T00:00:00`)) return false;
          if (dateTo && recordDate > new Date(`${dateTo}T23:59:59`)) return false;
          return true;
        });
      }

      // 2. Filtrado por multiselect de responsables
      if (selectedResponsibles.length > 0) {
        filteredRows = filteredRows.filter((row) => {
          if (source === 'visitas') {
            const val = String(row.responsable || '').toUpperCase();
            return selectedResponsibles.some((r) => val.includes(r.toUpperCase()));
          }
          if (source === 'tareas') {
            const assigned = String(row.assigned_to || row.assignedTo || '').toUpperCase();
            return selectedResponsibles.some((r) => assigned.includes(r.toUpperCase()));
          }
          if (source === 'personal') {
            const name = String(row.name || '').toUpperCase();
            return selectedResponsibles.some((r) => name.includes(r.toUpperCase()));
          }
          if (source === 'novedades' || source === 'diligenciamientos') {
            const author = String(row.author_name || row.authorName || '').toUpperCase();
            return selectedResponsibles.some((r) => author.includes(r.toUpperCase()));
          }
          return true;
        });
      }

      // 3. Filtrado por multiselect de estados
      if (selectedStatuses.length > 0) {
        filteredRows = filteredRows.filter((row) => {
          if (source === 'tareas') {
            const val = String(row.status || '').toLowerCase();
            return selectedStatuses.some((s) => val === s.toLowerCase());
          }
          if (source === 'personal') {
            const val = String(row.status || '').toLowerCase();
            return selectedStatuses.some((s) => val === s.toLowerCase());
          }
          return false; // No aplica filtro y se descarta en otras fuentes si el filtro está activo
        });
      }

      // 4. Ordenamiento
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

      reportData[source] = filteredRows.map((row) => uppercaseRecord(normalizeRecord(source, row)));
    }

    return reportData;
  };

  // Carga/Filtros automáticos en tiempo real
  useEffect(() => {
    let active = true;
    const loadPreviewData = async () => {
      setIsLoadingPreview(true);
      try {
        const data = await fetchData();
        if (active) {
          setDataPreview(data);
          setShowPreview(true);
        }
      } catch (error) {
        console.error('Error fetching preview data:', error);
        if (active) {
          toast.error('Error al cargar la vista previa en tiempo real');
        }
      } finally {
        if (active) {
          setIsLoadingPreview(false);
        }
      }
    };

    loadPreviewData();

    return () => {
      active = false;
    };
  }, [dataSource, selectedCategory, dateFrom, dateTo, sortBy, selectedResponsibles, selectedStatuses]);

  const generateExcel = async (data: ReportData) => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'SGA-PZBP';
      workbook.lastModifiedBy = 'SGA-PZBP';
      workbook.created = new Date();

      // Función para obtener el logo (convertir a base64)
      const getLogoBase64 = async () => {
        try {
          const response = await fetch('/logo-pna.png');
          const blob = await response.blob();
          return new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(blob);
          });
        } catch (e) {
          return null;
        }
      };

      const logoBase64 = await getLogoBase64();

      // 1. Crear Hoja de PORTADA / METADATOS
      const coverSheet = workbook.addWorksheet('PORTADA');
      coverSheet.views = [{ showGridLines: true }];
      coverSheet.getColumn(1).width = 30;
      coverSheet.getColumn(2).width = 50;

      // Añadir Logo si existe en PORTADA
      if (logoBase64) {
        const logoId = workbook.addImage({
          base64: logoBase64,
          extension: 'png',
        });
        coverSheet.addImage(logoId, {
          tl: { col: 0, row: 0 },
          ext: { width: 60, height: 60 },
        });
      }

      // Títulos institucionales en PORTADA
      coverSheet.getCell('B1').value = 'SGA PZBP-MS - SISTEMA DE GESTIÓN ADMINISTRATIVA';
      coverSheet.getCell('B1').font = { name: 'Arial Black', size: 12, color: { argb: 'FF1A1A1A' } };
      
      coverSheet.getCell('B2').value = 'PREFECTURA NAVAL ARGENTINA - ZONA BAJO PARANÁ';
      coverSheet.getCell('B2').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF555555' } };

      coverSheet.getCell('B3').value = 'REPORTE OPERATIVO PREMIUM';
      coverSheet.getCell('B3').font = { name: 'Arial Black', size: 14, color: { argb: 'FF0055FF' } };

      // Metadatos
      coverSheet.getCell('A5').value = 'METADATOS DE EXPORTACIÓN';
      coverSheet.getCell('A5').font = { name: 'Arial', size: 11, bold: true, underline: true };

      coverSheet.getCell('A7').value = 'FECHA DE GENERACIÓN:';
      coverSheet.getCell('A7').font = { bold: true, size: 9 };
      coverSheet.getCell('B7').value = new Date().toLocaleString('es-ES').toUpperCase();
      coverSheet.getCell('B7').font = { size: 9 };

      coverSheet.getCell('A8').value = 'USUARIO GENERADOR:';
      coverSheet.getCell('A8').font = { bold: true, size: 9 };
      coverSheet.getCell('B8').value = (getCurrentUserEmail() || 'SISTEMA SGA').toUpperCase();
      coverSheet.getCell('B8').font = { size: 9 };

      coverSheet.getCell('A9').value = 'PERÍODO DETALLADO:';
      coverSheet.getCell('A9').font = { bold: true, size: 9 };
      coverSheet.getCell('B9').value = periodLabel.toUpperCase();
      coverSheet.getCell('B9').font = { size: 9 };

      coverSheet.getCell('A10').value = 'ORDENAMIENTO APLICADO:';
      coverSheet.getCell('A10').font = { bold: true, size: 9 };
      coverSheet.getCell('B10').value = SORT_LABELS[sortBy].toUpperCase();
      coverSheet.getCell('B10').font = { size: 9 };

      coverSheet.getCell('A11').value = 'FILTRO DE RESPONSABLES:';
      coverSheet.getCell('A11').font = { bold: true, size: 9 };
      coverSheet.getCell('B11').value = selectedResponsibles.length > 0 ? selectedResponsibles.join(', ').toUpperCase() : 'TODOS';
      coverSheet.getCell('B11').font = { size: 9 };

      coverSheet.getCell('A12').value = 'FILTRO DE ESTADOS:';
      coverSheet.getCell('A12').font = { bold: true, size: 9 };
      coverSheet.getCell('B12').value = selectedStatuses.length > 0 ? selectedStatuses.join(', ').toUpperCase() : 'TODOS';
      coverSheet.getCell('B12').font = { size: 9 };

      // Resumen de registros por hoja
      coverSheet.getCell('A14').value = 'RESUMEN DE REGISTROS POR HOJA';
      coverSheet.getCell('A14').font = { name: 'Arial', size: 11, bold: true, underline: true };

      // Cabeceras de tabla de resumen
      coverSheet.getCell('A16').value = 'HOJA / MÓDULO';
      coverSheet.getCell('A16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
      coverSheet.getCell('A16').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
      coverSheet.getCell('A16').alignment = { horizontal: 'center' };

      coverSheet.getCell('B16').value = 'CANTIDAD DE REGISTROS';
      coverSheet.getCell('B16').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A1A' } };
      coverSheet.getCell('B16').font = { color: { argb: 'FFFFFFFF' }, bold: true, size: 9 };
      coverSheet.getCell('B16').alignment = { horizontal: 'center' };

      let summaryRowIdx = 17;
      let totalCountAllSheets = 0;

      for (const [source, records] of Object.entries(data)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        coverSheet.getCell(`A${summaryRowIdx}`).value = SOURCE_LABELS[source].toUpperCase();
        coverSheet.getCell(`A${summaryRowIdx}`).border = { bottom: { style: 'thin' }, right: { style: 'thin' }, left: { style: 'thin' } };
        coverSheet.getCell(`A${summaryRowIdx}`).font = { size: 9 };

        coverSheet.getCell(`B${summaryRowIdx}`).value = records.length;
        coverSheet.getCell(`B${summaryRowIdx}`).alignment = { horizontal: 'right' };
        coverSheet.getCell(`B${summaryRowIdx}`).border = { bottom: { style: 'thin' }, right: { style: 'thin' }, left: { style: 'thin' } };
        coverSheet.getCell(`B${summaryRowIdx}`).font = { size: 9 };

        totalCountAllSheets += records.length;
        summaryRowIdx++;
      }

      // Fila de Total General en Portada
      coverSheet.getCell(`A${summaryRowIdx}`).value = 'TOTAL GENERAL';
      coverSheet.getCell(`A${summaryRowIdx}`).font = { bold: true, size: 9 };
      coverSheet.getCell(`A${summaryRowIdx}`).border = { top: { style: 'double' }, bottom: { style: 'thin' } };

      coverSheet.getCell(`B${summaryRowIdx}`).value = totalCountAllSheets;
      coverSheet.getCell(`B${summaryRowIdx}`).font = { bold: true, size: 9 };
      coverSheet.getCell(`B${summaryRowIdx}`).alignment = { horizontal: 'right' };
      coverSheet.getCell(`B${summaryRowIdx}`).border = { top: { style: 'double' }, bottom: { style: 'thin' } };

      // Firmas en la Portada
      const signatureRow = summaryRowIdx + 3;
      coverSheet.getCell(`A${signatureRow}`).value = '__________________________________';
      coverSheet.getCell(`A${signatureRow}`).alignment = { horizontal: 'center' };
      coverSheet.getCell(`A${signatureRow + 1}`).value = 'FIRMA DEL RESPONSABLE';
      coverSheet.getCell(`A${signatureRow + 1}`).font = { name: 'Arial', size: 9, bold: true };
      coverSheet.getCell(`A${signatureRow + 1}`).alignment = { horizontal: 'center' };

      coverSheet.getCell(`B${signatureRow}`).value = '__________________________________';
      coverSheet.getCell(`B${signatureRow}`).alignment = { horizontal: 'center' };
      coverSheet.getCell(`B${signatureRow + 1}`).value = 'VALIDACIÓN SGA';
      coverSheet.getCell(`B${signatureRow + 1}`).font = { name: 'Arial', size: 9, bold: true };
      coverSheet.getCell(`B${signatureRow + 1}`).alignment = { horizontal: 'center' };

      // 2. Procesar los registros para cada hoja temática
      for (const [source, records] of Object.entries(data)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        const sheet = workbook.addWorksheet(SOURCE_LABELS[source].toUpperCase().slice(0, 31));
        sheet.views = [{ showGridLines: true }];

        const columns = REPORT_COLUMNS[source] || [];

        // Definir columnas (headers obligatoriamente en Fila 1)
        sheet.columns = columns.map((col) => ({
          header: col.label.toUpperCase(),
          key: col.key,
        }));

        // Estilo de los encabezados de tabla (Fila 1)
        const headerRow = sheet.getRow(1);
        headerRow.height = 25;
        headerRow.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF1A1A1A' },
          };
          cell.font = {
            color: { argb: 'FFFFFFFF' },
            bold: true,
            size: 10,
          };
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'medium', color: { argb: 'FF000000' } },
            right: { style: 'thin' },
          };
        });

        // Añadir Datos (Fila 2 en adelante)
        records.forEach((record, idx) => {
          const rowData = columns.map((col) => record[col.key]);
          const row = sheet.addRow(rowData);
          row.height = 20;

          // Estilo Zebra y bordes
          const isEven = idx % 2 === 0;
          row.eachCell((cell, colIndex) => {
            const col = columns[colIndex - 1];
            const val = cell.value;

            // Formatear fechas como tipo Date de Excel
            if (col && (col.key === 'fecha' || col.key === 'vencimiento') && typeof val === 'string' && val !== '—') {
              const dateParts = val.split('/');
              if (dateParts.length === 3) {
                const d = parseInt(dateParts[0], 10);
                const m = parseInt(dateParts[1], 10) - 1; // Mes 0-indexado
                const y = parseInt(dateParts[2], 10);
                const dateObj = new Date(y, m, d);
                if (!isNaN(dateObj.getTime())) {
                  cell.value = dateObj;
                  cell.numFmt = 'dd/mm/yyyy';
                }
              } else {
                const dateObj = new Date(val);
                if (!isNaN(dateObj.getTime())) {
                  cell.value = dateObj;
                  cell.numFmt = 'dd/mm/yyyy';
                }
              }
            }

            if (isEven) {
              cell.fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: 'FFF5F0E8' },
              };
            }
            cell.border = {
              top: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              left: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              bottom: { style: 'thin', color: { argb: 'FFCCCCCC' } },
              right: { style: 'thin', color: { argb: 'FFCCCCCC' } },
            };
            cell.font = { size: 9 };
            cell.alignment = { vertical: 'middle' };

            // Color dinámico para estados e indicadores
            if (col && (col.key === 'estado' || col.key === 'prioridad')) {
              const lowerVal = String(val).toLowerCase();
              if (['completado', 'activo', 'operativo', 'baja', 'alta'].includes(lowerVal)) {
                cell.font = { color: { argb: 'FF008000' }, bold: true, size: 9 };
              } else if (['pendiente', 'inactivo', 'alta', 'media'].includes(lowerVal)) {
                cell.font = { color: { argb: 'FFFF0000' }, bold: true, size: 9 };
              }
            }
          });
        });

        // Congelar primera fila (Headers)
        sheet.views = [
          { state: 'frozen', xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' } as any,
        ];

        // Autofiltros en la fila 1
        sheet.autoFilter = {
          from: { row: 1, column: 1 },
          to: { row: 1, column: columns.length },
        };

        // Formato automático de anchos de columnas
        sheet.columns.forEach((column) => {
          let maxLength = 0;
          column.eachCell?.({ includeEmpty: true }, (cell) => {
            let colLength = 10;
            if (cell.value !== null && cell.value !== undefined) {
              if (cell.value instanceof Date) {
                colLength = 12;
              } else {
                colLength = String(cell.value).length;
              }
            }
            if (colLength > maxLength) {
              maxLength = colLength;
            }
          });
          column.width = Math.max(12, maxLength + 4);
        });
      }

      // Descarga del Archivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      const fileName = `REPORTE_SGA_PREMIUM_${dataSource.toUpperCase()}_${new Date().toISOString().split('T')[0]}.xlsx`;
      anchor.download = fileName;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast.success('EXCEL PREMIUM GENERADO CON ÉXITO', { id: 'report-gen' });
    } catch (error) {
      console.error('Error generating Excel:', error);
      toast.error('Error al estructurar o descargar el archivo Excel');
    }
  };

  const handleGenerateReport = async () => {
    if (totalRecords === 0) {
      toast.error('No hay datos disponibles en el período y filtros seleccionados');
      return;
    }
    setIsGenerating(true);
    try {
      const data = await fetchData();
      await generateExcel(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el reporte');
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePdf = async (data: ReportData) => {
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: paperSize,
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. PORTADA
      // Fondo y Encabezado institucional
      doc.setFillColor(26, 26, 26);
      doc.rect(15, 15, pageWidth - 30, 25, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('PREFECTURA NAVAL ARGENTINA - REPORTE OPERATIVO', pageWidth / 2, 25, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('SGA PZBP - SISTEMA DE GESTIÓN ADMINISTRATIVA', pageWidth / 2, 32, { align: 'center' });

      // Metadatos
      doc.setTextColor(26, 26, 26);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('METADATOS DE EXPORTACIÓN', 15, 52);
      
      // Dibujar una línea sutil
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(15, 54, pageWidth - 15, 54);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text('FECHA DE GENERACIÓN:', 15, 62);
      doc.setFont('helvetica', 'normal');
      doc.text(new Date().toLocaleString('es-ES').toUpperCase(), 65, 62);

      doc.setFont('helvetica', 'bold');
      doc.text('USUARIO GENERADOR:', 15, 68);
      doc.setFont('helvetica', 'normal');
      doc.text((getCurrentUserEmail() || 'SISTEMA SGA').toUpperCase(), 65, 68);

      doc.setFont('helvetica', 'bold');
      doc.text('PERÍODO DETALLADO:', 15, 74);
      doc.setFont('helvetica', 'normal');
      doc.text(periodLabel.toUpperCase(), 65, 74);

      doc.setFont('helvetica', 'bold');
      doc.text('ORDENAMIENTO APLICADO:', 15, 80);
      doc.setFont('helvetica', 'normal');
      doc.text(SORT_LABELS[sortBy].toUpperCase(), 65, 80);

      doc.setFont('helvetica', 'bold');
      doc.text('FILTRO DE RESPONSABLES:', 15, 86);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedResponsibles.length > 0 ? selectedResponsibles.join(', ').toUpperCase() : 'TODOS', 65, 86);

      doc.setFont('helvetica', 'bold');
      doc.text('FILTRO DE ESTADOS:', 15, 92);
      doc.setFont('helvetica', 'normal');
      doc.text(selectedStatuses.length > 0 ? selectedStatuses.join(', ').toUpperCase() : 'TODOS', 65, 92);

      // Tabla de Resumen en Portada
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('RESUMEN DE REGISTROS POR HOJA', 15, 105);
      doc.line(15, 107, pageWidth - 15, 107);

      const summaryHeaders = [['HOJA / MÓDULO', 'CANTIDAD DE REGISTROS']];
      const summaryRows: any[] = [];
      let totalCountAllSheets = 0;

      for (const [source, records] of Object.entries(data)) {
        if (!Array.isArray(records) || records.length === 0) continue;
        summaryRows.push([
          SOURCE_LABELS[source].toUpperCase(),
          records.length.toString()
        ]);
        totalCountAllSheets += records.length;
      }
      summaryRows.push(['TOTAL GENERAL', totalCountAllSheets.toString()]);

      autoTable(doc, {
        startY: 112,
        head: summaryHeaders,
        body: summaryRows,
        theme: 'grid',
        styles: { font: 'helvetica', fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
        didParseCell: (dataCell) => {
          if (dataCell.row.index === summaryRows.length - 1) {
            dataCell.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 15, right: 15 }
      });

      // Firmas en la Portada (ubicadas dinámicamente)
      const finalY = (doc as any).lastAutoTable?.finalY || 112;
      const signatureY = Math.min(pageHeight - 35, finalY + 25);

      doc.setDrawColor(0, 0, 0);
      doc.line(30, signatureY, 90, signatureY);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.text('FIRMA DEL RESPONSABLE', 60, signatureY + 5, { align: 'center' });

      doc.line(pageWidth - 90, signatureY, pageWidth - 30, signatureY);
      doc.text('VALIDACIÓN SGA', pageWidth - 60, signatureY + 5, { align: 'center' });

      // 2. TABLAS TEMÁTICAS
      for (const [source, records] of Object.entries(data)) {
        if (!Array.isArray(records) || records.length === 0) continue;

        doc.addPage();

        // Título de la sección
        doc.setTextColor(26, 26, 26);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text(SOURCE_LABELS[source].toUpperCase(), 15, 20);
        
        doc.setDrawColor(26, 26, 26);
        doc.setLineWidth(0.8);
        doc.line(15, 23, pageWidth - 15, 23);

        const columns = REPORT_COLUMNS[source] || [];
        const tableHeaders = [columns.map(col => col.label.toUpperCase())];
        
        // Mapear y sanear datos a UPPERCASE estrictamente
        const tableRows = records.map(record =>
          columns.map(col => {
            const val = record[col.key];
            if (val === null || val === undefined) return '—';
            return String(val).toUpperCase();
          })
        );

        autoTable(doc, {
          startY: 28,
          head: tableHeaders,
          body: tableRows,
          theme: 'grid',
          styles: { overflow: 'linebreak', fontSize: 9, font: 'helvetica', cellPadding: 3 },
          headStyles: { fillColor: [26, 26, 26], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [245, 240, 232] },
          margin: { left: 15, right: 15 }
        });
      }

      // 3. NUMERACIÓN DINÁMICA DE PÁGINAS
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(128, 128, 128);
        doc.text(
          `PÁGINA ${i} DE ${totalPages}`.toUpperCase(),
          pageWidth / 2,
          pageHeight - 10,
          { align: 'center' }
        );
      }

      // Descargar PDF
      const fileName = `REPORTE_SGA_PREMIUM_${dataSource.toUpperCase()}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);

      toast.success('REPORTE PDF GENERADO CON ÉXITO', { id: 'report-pdf-gen' });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Error al estructurar o descargar el archivo PDF');
    }
  };

  const handleGeneratePdfReport = async () => {
    if (totalRecords === 0) {
      toast.error('No hay datos disponibles en el período y filtros seleccionados');
      return;
    }
    setIsGeneratingPdf(true);
    try {
      const data = await fetchData();
      await generatePdf(data);
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el reporte PDF');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const renderBadgeClass = (value: unknown) => {
    const normalized = String(value || '').toLowerCase();
    if (['alta', 'inactivo', 'pendiente'].includes(normalized)) return 'bg-[#e63b2e] text-white';
    if (['media', 'en_proceso', 'mantenimiento'].includes(normalized)) return 'bg-[#0055ff] text-white';
    if (['baja', 'completado', 'activo', 'operativo'].includes(normalized)) return 'bg-[#00cc66] text-white';
    return 'bg-[#1a1a1a] text-white';
  };

  const filteredResponsibles = useMemo(() => {
    return availableResponsibles.filter((name) =>
      name.toLowerCase().includes(responsibleSearch.toLowerCase())
    );
  }, [availableResponsibles, responsibleSearch]);

  return (
    <div className="font-['Inter'] max-w-7xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {/* Header Panel */}
      <div className="mb-6 overflow-hidden border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
        <div className="bg-black text-white px-5 py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-[#8fb2ff] mb-1">Centro de reportes</p>
            <h1 className="text-2xl sm:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">Reporte operativo</h1>
          </div>
          <div className="flex items-center gap-3 text-xs font-black uppercase">
            <BarChart3 className="w-5 h-5 text-[#8fb2ff]" />
            {totalRecords} registros listos
          </div>
        </div>
        <div className="px-5 py-4 bg-[#f5f0e8] grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-bold uppercase border-t-4 border-black">
          <div><span className="opacity-50 block text-[10px] font-black">Fuente</span>{SOURCE_LABELS[dataSource] || dataSource}</div>
          <div><span className="opacity-50 block text-[10px] font-black">Período</span>{periodLabel}</div>
          <div><span className="opacity-50 block text-[10px] font-black">Orden</span>{SORT_LABELS[sortBy]}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-6">
        {/* Filters Sidebar */}
        <aside className="bg-white border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] h-fit xl:sticky xl:top-4">
          <div className="flex items-center gap-2 border-b-4 border-black pb-3 mb-5">
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
                }}
                className="w-full p-3 border-4 border-black bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
                  }}
                  className="w-full p-3 border-4 border-black bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
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
              }}
              dateTo={dateTo}
              onDateToChange={(value: string) => {
                setDateTo(value);
              }}
            />

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Ordenamiento</label>
              <select
                value={sortBy}
                onChange={(event) => {
                  setSortBy(event.target.value);
                }}
                className="w-full p-3 border-4 border-black bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <option value="fecha_desc">Fecha (Descendente)</option>
                <option value="fecha_asc">Fecha (Ascendente)</option>
                <option value="titulo_az">Título (A-Z)</option>
                <option value="titulo_za">Título (Z-A)</option>
              </select>
            </div>

            {/* Multiselector de Usuario Responsable */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black uppercase tracking-widest">Usuario Responsable</label>
                {selectedResponsibles.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedResponsibles([])}
                    className="text-[9px] font-black uppercase underline hover:text-[#0055ff]"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="border-4 border-black bg-white p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] space-y-2">
                <input
                  type="text"
                  value={responsibleSearch}
                  onChange={(e) => setResponsibleSearch(e.target.value)}
                  placeholder="Buscar responsable..."
                  className="w-full p-2 border-2 border-black bg-[#f5f0e8] text-xs font-bold uppercase focus:outline-none"
                />
                <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                  {filteredResponsibles.length === 0 ? (
                    <p className="text-[10px] uppercase font-bold text-gray-500 p-1">No se encontraron responsables</p>
                  ) : (
                    filteredResponsibles.map((name) => {
                      const isSelected = selectedResponsibles.includes(name);
                      return (
                        <label
                          key={name}
                          className={`flex items-center gap-2 p-1 hover:bg-[#f5f0e8] cursor-pointer text-xs font-bold uppercase transition-colors ${
                            isSelected ? 'bg-blue-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedResponsibles((prev) =>
                                prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]
                              );
                            }}
                            className="w-4 h-4 accent-black border-2 border-black cursor-pointer"
                          />
                          <span className="truncate">{name}</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Multiselector de Estado */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-[10px] font-black uppercase tracking-widest">Estado (Tareas/Personal)</label>
                {selectedStatuses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStatuses([])}
                    className="text-[9px] font-black uppercase underline hover:text-[#0055ff]"
                  >
                    Limpiar
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => {
                  const isSelected = selectedStatuses.includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        setSelectedStatuses((prev) =>
                          prev.includes(opt.value) ? prev.filter((s) => s !== opt.value) : [...prev, opt.value]
                        );
                      }}
                      className={`px-2 py-1.5 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none transition-all ${
                        isSelected ? 'bg-[#0055ff] text-white' : 'bg-[#f5f0e8] text-black hover:bg-white'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selector Tamaño de Papel */}
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest mb-2">Tamaño de Papel</label>
              <select
                value={paperSize}
                onChange={(event) => setPaperSize(event.target.value)}
                className="w-full p-3 border-4 border-black bg-[#f5f0e8] focus:outline-none font-black uppercase text-sm shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
              >
                <option value="a4">A4</option>
                <option value="letter">Carta (Letter)</option>
                <option value="legal">Oficio (Legal)</option>
              </select>
            </div>

            {/* Botones de Descarga */}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <button
                type="button"
                onClick={handleGenerateReport}
                disabled={totalRecords === 0 || isGenerating || isLoadingPreview || isGeneratingPdf}
                className="py-4 border-4 border-black bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-xs sm:text-sm cursor-pointer"
              >
                {isGenerating ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FileSpreadsheet className="w-5 h-5" /> Excel
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleGeneratePdfReport}
                disabled={totalRecords === 0 || isGenerating || isLoadingPreview || isGeneratingPdf}
                className="py-4 border-4 border-black bg-[#ff5500] text-white font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all flex items-center justify-center gap-2 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-xs sm:text-sm cursor-pointer"
              >
                {isGeneratingPdf ? (
                  <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <FileText className="w-5 h-5" /> PDF
                  </>
                )}
              </button>
            </div>
          </div>
        </aside>

        {/* Preview Panel */}
        <main className="min-w-0">
          {isLoadingPreview && Object.keys(dataPreview).length === 0 ? (
            <div className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] p-8 sm:p-16 flex flex-col items-center justify-center text-center min-h-[520px]">
              <div className="w-16 h-16 border-8 border-black border-t-[#00cc66] rounded-full animate-spin mb-6" />
              <h3 className="text-2xl font-black uppercase mb-3 font-['Space_Grotesk']">Cargando datos</h3>
              <p className="text-xs font-bold opacity-60 max-w-md uppercase leading-relaxed">
                Consultando la base de datos de Supabase y normalizando los registros en tiempo real...
              </p>
            </div>
          ) : (
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
              {/* Alerta de no registros */}
              {totalRecords === 0 && (
                <div className="bg-[#ffdd00] text-black border-4 border-black p-5 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] font-bold uppercase text-xs flex flex-col sm:flex-row items-center gap-4">
                  <div className="p-3 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] shrink-0">
                    <AlertTriangle className="w-8 h-8 text-black" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black mb-1">Sin registros coincidentes</h4>
                    <p className="opacity-85 font-bold leading-normal">
                      La consulta no devolvió ningún registro para el período o filtros seleccionados.
                      El botón "DESCARGAR EXCEL" se encuentra bloqueado hasta que existan datos.
                    </p>
                  </div>
                </div>
              )}

              {/* Estadísticas de Vista Previa */}
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="col-span-2 p-5 border-4 border-black bg-black text-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest text-[#8fb2ff] mb-2">Resumen de Registros</p>
                  <p className="text-4xl font-black font-['Space_Grotesk']">{totalRecords}</p>
                  <p className="text-xs font-bold uppercase opacity-70">registros en el período actual</p>
                </div>
                <div className="p-5 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Tareas</p>
                  <p className="text-3xl font-black font-['Space_Grotesk']">{taskCompletion}%</p>
                  <p className="text-xs font-bold uppercase opacity-60">completitud</p>
                </div>
                <div className="p-5 border-4 border-black bg-white shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Estado</p>
                  <p className="text-3xl font-black font-['Space_Grotesk'] uppercase">{totalRecords > 0 ? 'LISTO' : 'VACÍO'}</p>
                  <p className="text-xs font-bold uppercase opacity-60">Filtros aplicados</p>
                </div>
              </section>

              {/* Grid de conteo de fuentes */}
              <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
                {Object.entries(dataCounts).map(([source, count]) => (
                  <div key={source} className={`p-4 border-4 border-black border-l-[12px] ${SOURCE_COLORS[source] || 'bg-white'} shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]`}>
                    <div className="flex items-center justify-between mb-3">
                      <div className="p-2 bg-white border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{sourceIcons[source] || <ClipboardList className="w-4 h-4" />}</div>
                      <span className="text-2xl font-black font-['Space_Grotesk']">{count}</span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest">{SOURCE_LABELS[source]}</p>
                  </div>
                ))}
              </section>

              {/* Tablas de Vista Previa Simplificadas */}
              {Object.entries(dataPreview).map(([source, records]) => {
                const columns = REPORT_COLUMNS[source] || [];

                return (
                  <section key={source} className="bg-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
                    <div className="bg-black text-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b-4 border-black">
                      <h2 className="text-sm sm:text-base font-black uppercase flex items-center gap-2 font-['Space_Grotesk']">
                        {sourceIcons[source] || <ClipboardList className="w-4 h-4" />}
                        {SOURCE_LABELS[source]}
                      </h2>
                      <span className="text-[10px] font-black uppercase tracking-widest text-[#8fb2ff]">{records.length} registros</span>
                    </div>

                    {records.length > 0 ? (
                      <div className="p-4 bg-[#f5f0e8]">
                        <div className="overflow-x-auto border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] bg-white">
                          <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                              <tr className="bg-black text-white border-b-4 border-black">
                                {columns.map((col) => (
                                  <th key={col.key} className="p-3 text-xs font-black uppercase tracking-wider border-r-2 border-black last:border-r-0">
                                    {col.label}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-black">
                              {records.slice(0, 5).map((record, index) => (
                                <tr key={index} className="hover:bg-[#f5f0e8] transition-colors odd:bg-[#faf6f0] even:bg-white">
                                  {columns.map((col) => {
                                    const val = record[col.key];
                                    const isBadge = col.priority === 'badge';
                                    return (
                                      <td key={col.key} className="p-3 text-xs font-bold uppercase border-r-2 border-black last:border-r-0 whitespace-nowrap">
                                        {isBadge ? (
                                          <span className={`inline-flex px-2 py-1 border-2 border-black text-[9px] font-black uppercase shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${renderBadgeClass(val)}`}>
                                            {safeText(val).replace('_', ' ')}
                                          </span>
                                        ) : (
                                          <span className="truncate block max-w-[200px]" title={safeText(val)}>
                                            {safeText(val)}
                                          </span>
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {records.length > 5 && (
                          <div className="mt-3 text-right text-[10px] font-black uppercase tracking-widest opacity-60">
                            Mostrando las primeras 5 de {records.length} filas. El reporte descargado incluirá todos los registros.
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
          )}
        </main>
      </div>
    </div>
  );
}
