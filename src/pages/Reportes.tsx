import {
  FileText,
  Download,
  Calendar,
  Database,
  FileSpreadsheet,
  FileJson,
  Eye,
  BarChart3,
  Users,
  HardHat,
  ListChecks,
  Newspaper,
  ArrowUpRight,
  Clock,
  TrendingUp,
  AlertTriangle,
  ChevronDown,
  Sparkles,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

/* ─── Animated stat card ─── */
function StatCard({
  icon,
  label,
  value,
  accent,
  delay = 0,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  accent: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="group relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_1px_3px_rgba(10,22,40,0.06),0_4px_12px_rgba(10,22,40,0.04)] hover:shadow-[0_4px_24px_rgba(10,22,40,0.10)] transition-shadow duration-300"
    >
      <div className={`absolute -top-6 -right-6 w-20 h-20 rounded-full opacity-[0.07] ${accent}`} />
      <div className="flex items-start justify-between relative">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-steel-500">{label}</p>
          <p className="text-3xl font-extrabold text-navy-900 mt-1 font-display tracking-tight">{value}</p>
        </div>
        <div className={`p-2.5 rounded-xl ${accent} text-white shadow-sm`}>{icon}</div>
      </div>
      <div className="mt-3 flex items-center gap-1 text-[11px] font-medium text-steel-400 group-hover:text-navy-500 transition-colors">
        <TrendingUp className="w-3 h-3" />
        <span>Ver detalle</span>
        <ArrowUpRight className="w-3 h-3 ml-0.5" />
      </div>
    </motion.div>
  );
}

/* ─── Config panel select / input ─── */
function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-steel-500 mb-2">
      {children}
    </label>
  );
}

function SelectField({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full appearance-none rounded-xl border border-steel-200 bg-white px-4 py-3 pr-10 text-sm font-medium text-navy-900 focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20 transition-all cursor-pointer"
      >
        {children}
      </select>
      <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-steel-400 pointer-events-none" />
    </div>
  );
}

function DateField({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  return (
    <div>
      <FieldLabel>
        <span className="flex items-center gap-1.5">
          <Calendar className="w-3 h-3" /> {label}
        </span>
      </FieldLabel>
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-steel-200 bg-white px-4 py-3 text-sm font-medium text-navy-900 focus:border-navy-400 focus:ring-2 focus:ring-navy-400/20 transition-all"
      />
    </div>
  );
}

/* ─── Format selector button ─── */
function FormatButton({
  format,
  active,
  onClick,
  icon,
  label,
  color,
}: {
  format: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 py-3 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-300 ${
        active
          ? `${color} text-white shadow-[0_4px_16px_rgba(10,22,40,0.15)] scale-[1.02]`
          : 'bg-white text-steel-600 border border-steel-200 hover:border-navy-300 hover:text-navy-700'
      }`}
    >
      {icon}
      {label}
      {active && (
        <motion.div
          layoutId="format-pill"
          className="absolute inset-0 rounded-xl bg-white/10"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}
    </button>
  );
}

/* ─── Main Page ─── */
export default function Reportes() {
  const [format, setFormat] = useState<'pdf' | 'excel' | 'json'>('pdf');
  const [dataSource, setDataSource] = useState('todas');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortBy, setSortBy] = useState('fecha_desc');
  const [isGenerating, setIsGenerating] = useState(false);
  const [dataPreview, setDataPreview] = useState<Record<string, any[]>>({});
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const fetchData = async () => {
    const data: Record<string, any[]> = {};

    const fetchCollection = async (colName: string) => {
      const q = query(collection(db, colName));
      const snapshot = await getDocs(q);
      let docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

      if (dateFrom || dateTo) {
        docs = docs.filter((doc: any) => {
          const docDate = doc.createdAt
            ? new Date(doc.createdAt)
            : doc.fecha
              ? new Date(doc.fecha)
              : null;
          if (!docDate) return true;
          if (dateFrom && new Date(dateFrom + 'T00:00:00') > docDate) return false;
          if (dateTo && new Date(dateTo + 'T23:59:59') < docDate) return false;
          return true;
        });
      }

      if (sortBy === 'fecha_desc') {
        docs.sort((a: any, b: any) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : a.fecha
              ? new Date(a.fecha).getTime()
              : 0;
          const dateB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : b.fecha
              ? new Date(b.fecha).getTime()
              : 0;
          return dateB - dateA;
        });
      } else if (sortBy === 'fecha_asc') {
        docs.sort((a: any, b: any) => {
          const dateA = a.createdAt
            ? new Date(a.createdAt).getTime()
            : a.fecha
              ? new Date(a.fecha).getTime()
              : 0;
          const dateB = b.createdAt
            ? new Date(b.createdAt).getTime()
            : b.fecha
              ? new Date(b.fecha).getTime()
              : 0;
          return dateA - dateB;
        });
      } else if (sortBy === 'prioridad') {
        const priorityOrder: Record<string, number> = { alta: 1, media: 2, baja: 3 };
        docs.sort((a: any, b: any) => {
          const pA = priorityOrder[a.priority?.toLowerCase()] || 4;
          const pB = priorityOrder[b.priority?.toLowerCase()] || 4;
          return pA - pB;
        });
      }

      return docs;
    };

    if (dataSource === 'todas' || dataSource === 'visitas')
      data.visitas = await fetchCollection('visitas');
    if (dataSource === 'todas' || dataSource === 'tareas')
      data.tareas = await fetchCollection('tasks');
    if (dataSource === 'todas' || dataSource === 'personal')
      data.personal = await fetchCollection('personal');
    if (dataSource === 'todas' || dataSource === 'novedades')
      data.novedades = await fetchCollection('novedades');

    return data;
  };

  const loadPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const data = await fetchData();
      setDataPreview(data);
      setShowPreview(true);
    } catch {
      toast.error('Error al cargar la vista previa');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /* ─── PDF generation (kept functionally identical, restyled overlay) ─── */
  const generatePDF = async (data: Record<string, any[]>) => {
    const totalVisitas = data.visitas?.length || 0;
    const totalTareas = data.tareas?.length || 0;
    const totalPersonal = data.personal?.length || 0;
    const totalNovedades = data.novedades?.length || 0;
    const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades;
    const now = new Date().toLocaleString('es-ES');
    const dateStr = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const tareasPendientes =
      data.tareas?.filter((t: any) => t.status === 'pendiente').length || 0;
    const tareasEnProceso =
      data.tareas?.filter((t: any) => t.status === 'en_proceso').length || 0;
    const tareasCompletadas =
      data.tareas?.filter((t: any) => t.status === 'completado').length || 0;
    const tareasAlta =
      data.tareas?.filter(
        (t: any) => t.priority === 'alta' && t.status !== 'completado'
      ).length || 0;
    const tareasMedia =
      data.tareas?.filter(
        (t: any) => t.priority === 'media' && t.status !== 'completado'
      ).length || 0;
    const tareasBaja =
      data.tareas?.filter(
        (t: any) => t.priority === 'baja' && t.status !== 'completado'
      ).length || 0;
    const tasaCompletitud =
      totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

    const overdueTasks =
      data.tareas?.filter((t: any) => {
        if (!t.dueDate || t.status === 'completado') return false;
        return new Date(t.dueDate) < new Date();
      }) || [];

    const visitCountByDest: Record<string, number> = {};
    data.visitas?.forEach((v: any) => {
      const dest = v.destino || 'N/A';
      visitCountByDest[dest] = (visitCountByDest[dest] || 0) + 1;
    });
    const topDestinations = Object.entries(visitCountByDest)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const visitCountByResp: Record<string, number> = {};
    data.visitas?.forEach((v: any) => {
      const resp = v.responsable || 'N/A';
      visitCountByResp[resp] = (visitCountByResp[resp] || 0) + 1;
    });
    const topResponsables = Object.entries(visitCountByResp)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const recentActivities: {
      date: string;
      type: string;
      detail: string;
      color: string;
    }[] = [];
    data.visitas?.slice(0, 3).forEach((v: any) => {
      recentActivities.push({
        date: v.fecha || 'N/A',
        type: 'VISITA',
        detail: `${v.origen || 'N/A'} → ${v.destino || 'N/A'}`,
        color: '#10b981',
      });
    });
    data.tareas?.slice(0, 3).forEach((t: any) => {
      recentActivities.push({
        date: t.createdAt
          ? new Date(t.createdAt).toLocaleDateString('es-ES')
          : 'N/A',
        type: 'TAREA',
        detail: t.title || 'Sin título',
        color: '#3b82f6',
      });
    });
    data.novedades?.slice(0, 2).forEach((n: any) => {
      recentActivities.push({
        date: n.createdAt
          ? new Date(n.createdAt).toLocaleDateString('es-ES')
          : 'N/A',
        type: 'NOVEDAD',
        detail: n.title || 'Sin título',
        color: '#8b5cf6',
      });
    });
    recentActivities.sort((a, b) => {
      if (a.date === 'N/A' || b.date === 'N/A') return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    const priorityColor = (p: string) => {
      if (p === 'alta') return '#ef4444';
      if (p === 'media') return '#f59e0b';
      if (p === 'baja') return '#10b981';
      return '#6b7280';
    };

    const statusColor = (s: string) => {
      if (s === 'completado' || s === 'Activo' || s === 'Operativo')
        return '#10b981';
      if (s === 'pendiente' || s === 'en_proceso' || s === 'Mantenimiento')
        return '#3b82f6';
      if (s === 'eliminado' || s === 'Inactivo') return '#ef4444';
      return '#6b7280';
    };

    const badge = (text: string, color: string) =>
      `<span style="display:inline-block;background:${color};color:#fff;padding:3px 10px;font-size:11px;font-weight:600;border-radius:9999px;letter-spacing:0.025em;">${text}</span>`;

    const donutChart = (
      segments: { label: string; value: number; color: string }[],
      title: string
    ) => {
      const total = segments.reduce((a, s) => a + s.value, 0);
      if (total === 0)
        return `<div style="text-align:center;padding:20px;color:#6b7280;font-size:13px;">Sin datos</div>`;
      const r = 45;
      const cx = 55;
      const cy = 55;
      const circumference = 2 * Math.PI * r;
      let offset = 0;
      const circles = segments
        .filter((s) => s.value > 0)
        .map((s) => {
          const pct = s.value / total;
          const dashLen = pct * circumference;
          const dashGap = circumference - dashLen;
          const circle = `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${s.color}" stroke-width="14" stroke-dasharray="${dashLen} ${dashGap}" stroke-dashoffset="${-offset}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="round"/>`;
          offset += dashLen;
          return circle;
        })
        .join('');
      const legendItems = segments
        .filter((s) => s.value > 0)
        .map(
          (s) =>
            `<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
          <div style="width:10px;height:10px;border-radius:50%;background:${s.color};flex-shrink:0;"></div>
          <span style="font-size:13px;color:#374151;font-weight:500;">${s.label}</span>
          <span style="font-size:13px;color:#111827;font-weight:700;margin-left:auto;">${s.value}</span>
        </div>`
        )
        .join('');
      return `
        <div style="display:flex;gap:24px;align-items:center;">
          <div style="flex-shrink:0;">
            <svg width="110" height="110" viewBox="0 0 110 110">
              ${circles}
              <circle cx="${cx}" cy="${cy}" r="34" fill="#fff"/>
              <text x="${cx}" y="${cy - 6}" text-anchor="middle" dominant-baseline="central" font-size="20" font-weight="800" fill="#111827" font-family="system-ui,-apple-system,sans-serif">${total}</text>
              <text x="${cx}" y="${cy + 12}" text-anchor="middle" dominant-baseline="central" font-size="8" font-weight:500" fill="#6b7280" font-family="system-ui,-apple-system,sans-serif">TOTAL</text>
            </svg>
          </div>
          <div style="flex:1;">
            <div style="font-size:12px;font-weight:700;color:#111827;margin-bottom:10px;text-transform:uppercase;letter-spacing:0.05em;">${title}</div>
            ${legendItems}
          </div>
        </div>`;
    };

    const progressBar = (
      label: string,
      value: number,
      max: number,
      color: string
    ) => {
      const pct = max > 0 ? Math.round((value / max) * 100) : 0;
      return `<div style="margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:600;color:#374151;">${label}</span>
          <span style="font-size:13px;font-weight:700;color:#111827;">${value} <span style="color:#6b7280;font-weight:400;">(${pct}%)</span></span>
        </div>
        <div style="width:100%;height:8px;background:#e5e7eb;border-radius:9999px;overflow:hidden;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:9999px;transition:width 0.3s;"></div>
        </div>
      </div>`;
    };

    const dataCard = (
      title: string,
      num: number,
      accent: string,
      fields: { label: string; value: string }[],
      extras?: string
    ) => `
      <div style="background:#fff;border:1px solid #e5e7eb;border-left:4px solid ${accent};border-radius:8px;padding:16px;margin-bottom:12px;page-break-inside:avoid;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <div style="font-size:14px;font-weight:700;color:#111827;">${title}</div>
          <div style="background:${accent}15;color:${accent};padding:2px 10px;border-radius:9999px;font-size:11px;font-weight:700;">#${num}</div>
        </div>
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(180px, 1fr));gap:8px;">
          ${fields
            .filter((f) => f.value)
            .map(
              (f) => `
            <div>
              <div style="font-size:10px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">${f.label}</div>
              <div style="font-size:13px;font-weight:500;color:#111827;margin-top:2px;">${f.value}</div>
            </div>
          `
            )
            .join('')}
        </div>
        ${extras || ''}
      </div>`;

    const commentsBlock = (comments: any[], accent: string) => {
      if (!comments || comments.length === 0) return '';
      return `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
          <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Comentarios (${comments.length})</div>
          ${comments
            .map(
              (c: any) => `
            <div style="background:#f9fafb;border-radius:6px;padding:10px;margin-bottom:6px;">
              <div style="font-size:11px;font-weight:600;color:#6b7280;">${c.authorName || 'Anónimo'} · ${c.createdAt ? new Date(c.createdAt).toLocaleString('es-ES') : ''}</div>
              <div style="font-size:12px;color:#374151;margin-top:4px;">${c.text || ''}</div>
            </div>
          `
            )
            .join('')}
        </div>`;
    };

    const subtasksBlock = (subtasks: any[], accent: string) => {
      if (!subtasks || subtasks.length === 0) return '';
      const done = subtasks.filter((s: any) => s.completed).length;
      return `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
          <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px;">Subtareas (${done}/${subtasks.length})</div>
          ${subtasks
            .map(
              (s: any) => `
            <div style="font-size:12px;color:${s.completed ? '#10b981' : '#374151'};padding:4px 0;display:flex;align-items:center;gap:6px;">
              <span style="font-size:14px;">${s.completed ? '✓' : '○'}</span> ${s.title || 'Sin título'}
            </div>
          `
            )
            .join('')}
        </div>`;
    };

    const attachmentsBlock = (attachments: any[], accent: string) => {
      if (!attachments || attachments.length === 0) return '';
      return `
        <div style="margin-top:12px;padding-top:12px;border-top:1px solid #e5e7eb;">
          <div style="font-size:11px;font-weight:700;color:${accent};text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Archivos adjuntos (${attachments.length})</div>
          ${attachments
            .map(
              (a: any) => `
            <div style="font-size:12px;color:#3b82f6;padding:2px 0;">📎 ${a.name || 'Archivo'} <span style="color:#6b7280;">(${a.type || 'Desconocido'})</span></div>
          `
            )
            .join('')}
        </div>`;
    };

    const tagsBlock = (tags: string[], accent: string) => {
      if (!tags || tags.length === 0) return '';
      return `
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
          ${tags
            .map(
              (t) =>
                `<span style="background:#eff6ff;color:${accent};padding:2px 8px;font-size:10px;font-weight:600;border-radius:9999px;">${t}</span>`
            )
            .join('')}
        </div>`;
    };

    const statCard = (
      label: string,
      value: string | number,
      icon: string,
      color: string
    ) => `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;flex:1;min-width:120px;">
        <div style="font-size:24px;margin-bottom:4px;">${icon}</div>
        <div style="font-size:28px;font-weight:900;color:${color};">${value}</div>
        <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">${label}</div>
      </div>`;

    const htmlContent = `
    <div style="width:100%;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;color:#111827;line-height:1.5;">
      <!-- COVER PAGE -->
      <div style="background:linear-gradient(135deg, #1e3a5f 0%, #0f2439 100%);color:#fff;padding:60px 40px;min-height:500px;display:flex;flex-direction:column;justify-content:center;">
        <div style="max-width:700px;margin:0 auto;width:100%;">
          <div style="font-size:12px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#93c5fd;margin-bottom:16px;">Sistema de Gestión de Actividades</div>
          <h1 style="font-size:42px;font-weight:900;margin:0 0 8px 0;line-height:1.1;letter-spacing:-0.02em;">REPORTE<br/>COMPLETO</h1>
          <div style="width:60px;height:4px;background:linear-gradient(90deg, #3b82f6, #10b981);border-radius:9999px;margin:20px 0;"></div>
          <p style="font-size:16px;color:#93c5fd;margin:0 0 32px 0;">Prefectura Naval Argentina — SGA PZBP</p>

          <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:24px;">
            ${statCard('Visitas', totalVisitas, '📍', '#60a5fa')}
            ${statCard('Tareas', totalTareas, '✅', '#34d399')}
            ${statCard('Personal', totalPersonal, '👥', '#a78bfa')}
            ${statCard('Novedades', totalNovedades, '📰', '#fbbf24')}
          </div>

          <div style="background:rgba(255,255,255,0.1);backdrop-filter:blur(10px);border-radius:10px;padding:16px;display:flex;justify-content:space-between;align-items:center;">
            <div>
              <div style="font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.1em;">Total de registros</div>
              <div style="font-size:32px;font-weight:900;">${totalRecords}</div>
            </div>
            <div style="text-align:right;">
              <div style="font-size:11px;color:#93c5fd;text-transform:uppercase;letter-spacing:0.1em;">Fecha de generación</div>
              <div style="font-size:14px;font-weight:600;margin-top:4px;">${dateStr}</div>
              <div style="font-size:12px;color:#93c5fd;margin-top:2px;">${now}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- KPIs DASHBOARD -->
      ${
        totalRecords > 0
          ? `
      <div style="padding:32px 40px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:24px;">
          <div style="width:8px;height:32px;background:linear-gradient(180deg, #3b82f6, #1d4ed8);border-radius:9999px;"></div>
          <div>
            <div style="font-size:20px;font-weight:800;color:#111827;text-transform:uppercase;letter-spacing:0.05em;">Indicadores Clave</div>
            <div style="font-size:13px;color:#6b7280;">Resumen general del sistema</div>
          </div>
        </div>

        <!-- Donut Charts -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:20px;margin-bottom:24px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
            ${donutChart(
              [
                { label: 'Pendientes', value: tareasPendientes, color: '#3b82f6' },
                { label: 'En proceso', value: tareasEnProceso, color: '#f59e0b' },
                { label: 'Completadas', value: tareasCompletadas, color: '#10b981' },
              ],
              'Estado de Tareas'
            )}
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
            ${donutChart(
              [
                { label: 'Alta', value: tareasAlta, color: '#ef4444' },
                { label: 'Media', value: tareasMedia, color: '#f59e0b' },
                { label: 'Baja', value: tareasBaja, color: '#10b981' },
              ],
              'Prioridad Activa'
            )}
          </div>
        </div>

        <!-- Progress bars + Completion rate -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:20px;">
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
            <div style="font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:16px;">Distribución por Fuente</div>
            ${progressBar('Visitas', totalVisitas, totalRecords, '#10b981')}
            ${progressBar('Tareas', totalTareas, totalRecords, '#3b82f6')}
            ${progressBar('Personal', totalPersonal, totalRecords, '#8b5cf6')}
            ${progressBar('Novedades', totalNovedades, totalRecords, '#f59e0b')}
          </div>
          <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;text-align:center;">
            <div style="font-size:13px;font-weight:700;color:#111827;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Tasa de Completitud</div>
            <div style="font-size:56px;font-weight:900;color:${tasaCompletitud >= 70 ? '#10b981' : tasaCompletitud >= 40 ? '#f59e0b' : '#ef4444'};">${tasaCompletitud}%</div>
            <div style="width:100%;height:12px;background:#e5e7eb;border-radius:9999px;overflow:hidden;margin:12px 0;">
              <div style="width:${tasaCompletitud}%;height:100%;background:${tasaCompletitud >= 70 ? '#10b981' : tasaCompletitud >= 40 ? '#f59e0b' : '#ef4444'};border-radius:9999px;"></div>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:12px;color:#6b7280;">
              <span>Pendientes: <strong style="color:#3b82f6;">${tareasPendientes}</strong></span>
              <span>En proceso: <strong style="color:#f59e0b;">${tareasEnProceso}</strong></span>
              <span>Completadas: <strong style="color:#10b981;">${tareasCompletadas}</strong></span>
            </div>
          </div>
        </div>
      </div>`
          : ''
      }

      <!-- OVERDUE TASKS -->
      ${
        overdueTasks.length > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="background:#fef2f2;border:1px solid #fecaca;border-left:4px solid #ef4444;border-radius:12px;padding:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
            <span style="font-size:24px;">⚠️</span>
            <div>
              <div style="font-size:16px;font-weight:800;color:#991b1b;text-transform:uppercase;">Tareas Vencidas</div>
              <div style="font-size:12px;color:#b91c1c;">${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} pendiente${overdueTasks.length > 1 ? 's' : ''} de plazo</div>
            </div>
          </div>
          <table style="width:100%;border-collapse:collapse;">
            <thead>
              <tr style="background:#fee2e2;">
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#991b1b;text-align:left;text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid #fecaca;">Tarea</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#991b1b;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Vencimiento</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#991b1b;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Prioridad</th>
                <th style="padding:10px 12px;font-size:11px;font-weight:700;color:#991b1b;text-align:left;text-transform:uppercase;letter-spacing:0.05em;">Estado</th>
              </tr>
            </thead>
            <tbody>
              ${overdueTasks
                .map(
                  (t: any) => `
              <tr style="border-bottom:1px solid #fee2e2;">
                <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#111827;">${t.title || 'Sin título'}</td>
                <td style="padding:10px 12px;font-size:13px;color:#ef4444;font-weight:600;">${t.dueDate || 'N/A'}</td>
                <td style="padding:10px 12px;">${badge(((t.priority || 'N/A') as string).toUpperCase(), priorityColor(t.priority))}</td>
                <td style="padding:10px 12px;">${badge(((t.status || 'N/A') as string).toUpperCase().replace('_', ' '), statusColor(t.status))}</td>
              </tr>`
                )
                .join('')}
            </tbody>
          </table>
        </div>
      </div>`
          : ''
      }

      <!-- VISIT ANALYSIS -->
      ${
        topDestinations.length > 0 || topResponsables.length > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="width:8px;height:24px;background:linear-gradient(180deg, #3b82f6, #1d4ed8);border-radius:9999px;"></div>
            <div style="font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;">Análisis de Visitas</div>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(250px, 1fr));gap:20px;">
            ${
              topDestinations.length > 0
                ? `
            <div>
              <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Destinos más frecuentes</div>
              ${topDestinations
                .map(
                  ([dest, count], i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i < topDestinations.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
                <div style="width:24px;height:24px;background:#eff6ff;color:#3b82f6;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">${i + 1}</div>
                <div style="flex:1;font-size:13px;font-weight:600;color:#111827;">${dest}</div>
                <div style="font-size:13px;font-weight:700;color:#3b82f6;">${count} visita${count > 1 ? 's' : ''}</div>
              </div>`
                )
                .join('')}
            </div>`
                : ''
            }
            ${
              topResponsables.length > 0
                ? `
            <div>
              <div style="font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Top responsables</div>
              ${topResponsables
                .map(
                  ([resp, count], i) => `
              <div style="display:flex;align-items:center;gap:10px;padding:8px 0;${i < topResponsables.length - 1 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
                <div style="width:24px;height:24px;background:#f0fdf4;color:#10b981;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:800;flex-shrink:0;">${i + 1}</div>
                <div style="flex:1;font-size:13px;font-weight:600;color:#111827;">${resp}</div>
                <div style="font-size:13px;font-weight:700;color:#10b981;">${count} visita${count > 1 ? 's' : ''}</div>
              </div>`
                )
                .join('')}
            </div>`
                : ''
            }
          </div>
        </div>
      </div>`
          : ''
      }

      <!-- RECENT ACTIVITY -->
      ${
        recentActivities.length > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:20px;">
          <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
            <div style="width:8px;height:24px;background:linear-gradient(180deg, #10b981, #059669);border-radius:9999px;"></div>
            <div style="font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;">Actividad Reciente</div>
          </div>
          <div style="position:relative;padding-left:20px;">
            <div style="position:absolute;left:5px;top:0;bottom:0;width:2px;background:#e5e7eb;"></div>
            ${recentActivities
              .slice(0, 8)
              .map(
                (act, i) => `
            <div style="position:relative;padding:10px 0 10px 16px;${i < 7 ? 'border-bottom:1px solid #f3f4f6;' : ''}">
              <div style="position:absolute;left:-20px;top:14px;width:12px;height:12px;border-radius:50%;background:${act.color};border:2px solid #fff;box-shadow:0 0 0 2px ${act.color}33;"></div>
              <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
                <span style="background:${act.color};color:#fff;padding:2px 8px;font-size:10px;font-weight:700;border-radius:9999px;text-transform:uppercase;">${act.type}</span>
                <span style="font-size:13px;font-weight:600;color:#111827;">${act.detail}</span>
                <span style="font-size:12px;color:#6b7280;margin-left:auto;">${act.date}</span>
              </div>
            </div>`
              )
              .join('')}
          </div>
        </div>
      </div>`
          : ''
      }

      <!-- VISITAS TÉCNICAS -->
      ${
        totalVisitas > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:8px;height:24px;background:linear-gradient(180deg, #10b981, #059669);border-radius:9999px;"></div>
          <div style="font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;">Visitas Técnicas</div>
          <div style="margin-left:auto;font-size:12px;color:#6b7280;background:#f0fdf4;padding:4px 12px;border-radius:9999px;font-weight:600;">${totalVisitas} registros</div>
        </div>
        ${data.visitas
          .map(
            (v: any, idx: number) =>
              dataCard(
                `${v.origen || 'N/A'} → ${v.destino || 'N/A'}`,
                idx + 1,
                '#10b981',
                [
                  { label: 'Fecha', value: v.fecha || 'N/A' },
                  { label: 'Hora', value: v.hora || 'N/A' },
                  { label: 'Responsable', value: v.responsable || 'N/A' },
                  { label: 'Origen', value: v.origen || 'N/A' },
                  { label: 'Destino', value: v.destino || 'N/A' },
                  { label: 'Observaciones', value: v.observaciones || '—' },
                ],
                commentsBlock(v.comments, '#10b981')
              )
          )
          .join('')}
      </div>`
          : ''
      }

      <!-- TAREAS OPERATIVAS -->
      ${
        totalTareas > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:8px;height:24px;background:linear-gradient(180deg, #3b82f6, #1d4ed8);border-radius:9999px;"></div>
          <div style="font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;">Tareas Operativas</div>
          <div style="margin-left:auto;font-size:12px;color:#6b7280;background:#eff6ff;padding:4px 12px;border-radius:9999px;font-weight:600;">${totalTareas} registros</div>
        </div>
        ${data.tareas
          .map((t: any, idx: number) => {
            const accent =
              t.priority === 'alta'
                ? '#ef4444'
                : t.priority === 'media'
                  ? '#f59e0b'
                  : '#10b981';
            return dataCard(
              t.title || 'Sin título',
              idx + 1,
              accent,
              [
                {
                  label: 'Prioridad',
                  value: badge(
                    ((t.priority || 'N/A') as string).toUpperCase(),
                    priorityColor(t.priority)
                  ),
                },
                {
                  label: 'Estado',
                  value: badge(
                    ((t.status || 'N/A') as string)
                      .toUpperCase()
                      .replace('_', ' '),
                    statusColor(t.status)
                  ),
                },
                { label: 'Vencimiento', value: t.dueDate || 'No definida' },
                {
                  label: 'Creada',
                  value: t.createdAt
                    ? new Date(t.createdAt).toLocaleString('es-ES')
                    : 'N/A',
                },
                {
                  label: 'Recurrencia',
                  value: (
                    t.recurrence && t.recurrence !== 'none'
                      ? t.recurrence
                      : '—'
                  ).toUpperCase(),
                },
                { label: 'Descripción', value: t.description || '—' },
              ],
              tagsBlock(t.tags || [], accent) +
                subtasksBlock(t.subtasks, accent) +
                commentsBlock(t.comments, accent) +
                attachmentsBlock(t.attachments, accent)
            );
          })
          .join('')}
      </div>`
          : ''
      }

      <!-- PERSONAL ACTIVO -->
      ${
        totalPersonal > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:8px;height:24px;background:linear-gradient(180deg, #8b5cf6, #6d28d9);border-radius:9999px;"></div>
          <div style="font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;">Personal Activo</div>
          <div style="margin-left:auto;font-size:12px;color:#6b7280;background:#f5f3ff;padding:4px 12px;border-radius:9999px;font-weight:600;">${totalPersonal} registros</div>
        </div>
        ${data.personal
          .map((p: any, idx: number) => {
            const accent = p.status === 'Activo' ? '#10b981' : '#ef4444';
            return dataCard(
              p.name || 'Sin nombre',
              idx + 1,
              accent,
              [
                { label: 'Nombre', value: p.name || 'N/A' },
                { label: 'Rol', value: p.role || 'N/A' },
                {
                  label: 'Estado',
                  value: badge(
                    (p.status || 'N/A').toUpperCase(),
                    statusColor(p.status)
                  ),
                },
              ]
            );
          })
          .join('')}
      </div>`
          : ''
      }

      <!-- NOVEDADES -->
      ${
        totalNovedades > 0
          ? `
      <div style="padding:0 40px 32px 40px;">
        <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
          <div style="width:8px;height:24px;background:linear-gradient(180deg, #f59e0b, #d97706);border-radius:9999px;"></div>
          <div style="font-size:16px;font-weight:800;color:#111827;text-transform:uppercase;">Novedades</div>
          <div style="margin-left:auto;font-size:12px;color:#6b7280;background:#fffbeb;padding:4px 12px;border-radius:9999px;font-weight:600;">${totalNovedades} registros</div>
        </div>
        ${data.novedades
          .map((n: any, idx: number) =>
            dataCard(
              n.title || 'Sin título',
              idx + 1,
              '#f59e0b',
              [
                {
                  label: 'Fecha',
                  value: n.createdAt
                    ? new Date(n.createdAt).toLocaleString('es-ES')
                    : 'N/A',
                },
                { label: 'Autor', value: n.authorName || 'N/A' },
                { label: 'Título', value: n.title || 'Sin título' },
                { label: 'Contenido', value: n.content || '—' },
              ],
              attachmentsBlock(n.attachments, '#f59e0b')
            )
          )
          .join('')}
      </div>`
          : ''
      }

      <!-- FOOTER -->
      <div style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
        <div style="font-size:12px;color:#6b7280;">SGA PZBP — Prefectura Naval Argentina</div>
        <div style="font-size:11px;color:#9ca3af;margin-top:4px;">Generado el ${now}</div>
      </div>
    </div>`;

    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(10,22,40,0.4);backdrop-filter:blur(8px);z-index:99999;overflow-y:auto;font-family:system-ui,-apple-system,sans-serif;';
    overlay.innerHTML = `
      <div style="position:sticky;top:0;z-index:10;background:rgba(255,255,255,0.95);backdrop-filter:blur(12px);padding:16px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(0,0,0,0.06);">
        <div>
          <div style="font-size:16px;font-weight:800;color:#0f2140;">Vista previa del reporte</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Revisá y descargá el PDF</div>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="pdf-download-btn" style="padding:10px 20px;background:linear-gradient(135deg, #1e4d8c, #152d54);color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;box-shadow:0 4px 12px rgba(15,33,64,0.2);">⬇ Descargar PDF</button>
          <button id="pdf-cancel-btn" style="padding:10px 20px;background:#fff;color:#ef4444;border:1px solid #e5e7eb;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
        </div>
      </div>
      <div style="max-width:794px;margin:24px auto;background:#fff;box-shadow:0 8px 32px rgba(10,22,40,0.12);border-radius:16px;overflow:hidden;" id="pdf-content">
        ${htmlContent}
      </div>
    `;
    document.body.appendChild(overlay);

    const downloadBtn = document.getElementById(
      'pdf-download-btn'
    ) as HTMLButtonElement;
    const cancelBtn = document.getElementById('pdf-cancel-btn');

    const cleanup = () => {
      const el = document.getElementById('pdf-overlay');
      if (el) document.body.removeChild(el);
    };

    if (cancelBtn) {
      cancelBtn.onclick = () => {
        cleanup();
        toast.info('Generación cancelada', { id: 'report-gen' });
      };
    }

    if (downloadBtn) {
      downloadBtn.onclick = async () => {
        downloadBtn.textContent = 'Generando PDF...';
        downloadBtn.disabled = true;

        const content = document.getElementById('pdf-content');
        if (!content) return;

        try {
          const canvas = await html2canvas(content, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff',
          });

          const pdf = new jsPDF('p', 'mm', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const pageHeightInCanvas = (pdfHeight / pdfWidth) * imgWidth;

          let yOffset = 0;
          let pageNum = 0;

          while (yOffset < imgHeight) {
            const remaining = imgHeight - yOffset;
            const sliceHeight = Math.min(pageHeightInCanvas, remaining);

            const pageCanvas = document.createElement('canvas');
            pageCanvas.width = imgWidth;
            pageCanvas.height = sliceHeight;
            const ctx = pageCanvas.getContext('2d');
            if (!ctx) break;

            ctx.drawImage(
              canvas,
              0,
              yOffset,
              imgWidth,
              sliceHeight,
              0,
              0,
              imgWidth,
              sliceHeight
            );

            const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
            const scaledPageHeight = (sliceHeight / imgWidth) * pdfWidth;

            if (pageNum > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledPageHeight);

            yOffset += sliceHeight;
            pageNum++;
          }

          cleanup();
          pdf.save(
            `Reporte_Completo_${new Date().toISOString().split('T')[0]}.pdf`
          );
          toast.success('PDF descargado con éxito', { id: 'report-gen' });
        } catch (err) {
          console.error(err);
          cleanup();
          toast.error('Error al generar el PDF', { id: 'report-gen' });
        }
      };
    }
  };

  const generateExcel = (data: Record<string, any[]>) => {
    const workbook = XLSX.utils.book_new();

    const sheetConfigs: Record<
      string,
      {
        columns: { key: string; header: string; width: number }[];
        color: { header: string; altRow: string };
      }
    > = {
      visitas: {
        columns: [
          { key: 'fecha', header: 'Fecha', width: 14 },
          { key: 'hora', header: 'Hora', width: 10 },
          { key: 'origen', header: 'Origen', width: 22 },
          { key: 'destino', header: 'Destino', width: 22 },
          { key: 'responsable', header: 'Responsable', width: 24 },
          { key: 'observaciones', header: 'Observaciones', width: 40 },
        ],
        color: { header: '10b981', altRow: 'f0fdf4' },
      },
      tareas: {
        columns: [
          { key: 'title', header: 'Título', width: 30 },
          { key: 'priority', header: 'Prioridad', width: 12 },
          { key: 'status', header: 'Estado', width: 14 },
          { key: 'dueDate', header: 'Vencimiento', width: 14 },
          { key: 'description', header: 'Descripción', width: 40 },
          { key: 'recurrence', header: 'Recurrencia', width: 16 },
        ],
        color: { header: '3b82f6', altRow: 'eff6ff' },
      },
      personal: {
        columns: [
          { key: 'name', header: 'Nombre', width: 30 },
          { key: 'role', header: 'Rol', width: 24 },
          { key: 'status', header: 'Estado', width: 14 },
        ],
        color: { header: '8b5cf6', altRow: 'f5f3ff' },
      },
      novedades: {
        columns: [
          { key: 'createdAt', header: 'Fecha', width: 22 },
          { key: 'title', header: 'Título', width: 30 },
          { key: 'authorName', header: 'Autor', width: 20 },
          { key: 'content', header: 'Contenido', width: 50 },
        ],
        color: { header: 'f59e0b', altRow: 'fffbeb' },
      },
    };

    const sheetLabels: Record<string, string> = {
      visitas: 'VISITAS TÉCNICAS',
      tareas: 'TAREAS OPERATIVAS',
      personal: 'PERSONAL ACTIVO',
      novedades: 'NOVEDADES',
    };

    Object.keys(data).forEach((key) => {
      const records = data[key];
      const config = sheetConfigs[key];
      if (!config) return;

      const worksheetData: any[] = [];

      worksheetData.push({
        A: sheetLabels[key] || key.toUpperCase(),
      });
      worksheetData.push({
        A: `Generado: ${new Date().toLocaleString('es-ES')}`,
      });
      worksheetData.push({ A: `Total de registros: ${records.length}` });
      worksheetData.push({});

      if (records.length > 0) {
        const headerRow: Record<string, string> = {};
        config.columns.forEach((col, idx) => {
          headerRow[String.fromCharCode(65 + idx)] = col.header;
        });
        worksheetData.push(headerRow);

        records.forEach((record, rowIdx) => {
          const row: Record<string, any> = {};
          config.columns.forEach((col, idx) => {
            const cellRef = String.fromCharCode(65 + idx);
            let val = record[col.key];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'object') {
              if (Array.isArray(val)) {
                if (col.key === 'createdAt' || col.key === 'timestamp') {
                  try {
                    val = new Date(val[0]).toLocaleString('es-ES');
                  } catch {
                    val = JSON.stringify(val).slice(0, 40);
                  }
                } else {
                  val = `${val.length} elemento(s)`;
                }
              } else {
                val = JSON.stringify(val).slice(0, 40);
              }
            }
            if (
              col.key === 'createdAt' ||
              col.key === 'timestamp' ||
              col.key === 'fecha' ||
              col.key === 'dueDate'
            ) {
              try {
                const d = new Date(val);
                if (!isNaN(d.getTime())) val = d.toLocaleString('es-ES');
              } catch {
                /* fall through */
              }
            }
            row[cellRef] = String(val).slice(0, 100);
          });
          worksheetData.push(row);
        });
      } else {
        worksheetData.push({ A: 'Sin datos para este período' });
      }

      const worksheet = XLSX.utils.json_to_sheet(worksheetData, {
        skipHeader: true,
      });

      const wscols = config.columns.map((col) => ({ wch: col.width }));
      worksheet['!cols'] = wscols;

      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: config.columns.length - 1 } },
      ];

      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        sheetLabels[key] || key.toUpperCase()
      );
    });

    if (workbook.SheetNames.length === 0) {
      const worksheet = XLSX.utils.json_to_sheet([
        { message: 'Sin datos para los filtros seleccionados' },
      ]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'REPORTE');
    }

    XLSX.writeFile(
      workbook,
      `Reporte_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const generateJSON = (data: Record<string, any[]>) => {
    const reportMetadata = {
      titulo: 'REPORTE COMPLETO',
      sistema: 'Sistema de Gestión de Actividades',
      organizacion: 'Prefectura Naval Argentina — SGA PZBP',
      fechaGeneracion: new Date().toISOString(),
      fechaLegible: new Date().toLocaleString('es-ES', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }),
      filtros: {
        fuenteDeDatos: dataSource,
        desde: dateFrom || 'Sin límite',
        hasta: dateTo || 'Sin límite',
        ordenarPor: sortBy,
      },
      resumen: {
        totalRegistros: Object.values(data).reduce(
          (sum, arr) => sum + arr.length,
          0
        ),
        visitas: data.visitas?.length || 0,
        tareas: data.tareas?.length || 0,
        personal: data.personal?.length || 0,
        novedades: data.novedades?.length || 0,
      },
    };

    const reportData = {
      metadata: reportMetadata,
      datos: Object.fromEntries(
        Object.entries(data).map(([key, records]) => [
          key,
          {
            total: records.length,
            registros: records.map((record) => {
              const cleaned: Record<string, any> = {};
              Object.entries(record).forEach(([k, v]) => {
                cleaned[k] = v;
              });
              return cleaned;
            }),
          },
        ])
      ),
      generadoPor: 'SGO PZBP - Sistema de Reportes',
    };

    const jsonString = JSON.stringify(reportData, null, 2);
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
      Object.values(data).forEach((arr) => {
        if (arr.length > 0) hasData = true;
      });

      if (!hasData) {
        toast.error('No hay datos para los filtros seleccionados', {
          id: 'report-gen',
        });
        setIsGenerating(false);
        return;
      }

      if (format === 'pdf') {
        await generatePDF(data);
      } else if (format === 'excel') {
        generateExcel(data);
      } else if (format === 'json') {
        generateJSON(data);
      }

      toast.success(
        `Reporte generado con éxito en formato ${format.toUpperCase()}`,
        { id: 'report-gen' }
      );
    } catch (error) {
      console.error(error);
      toast.error('Error al generar el reporte', { id: 'report-gen' });
    } finally {
      setIsGenerating(false);
    }
  };

  const dataCounts = Object.entries(dataPreview).reduce(
    (acc, [key, value]) => {
      acc[key] = value.length;
      return acc;
    },
    {} as Record<string, number>
  );

  const totalRecords = Object.values(dataCounts).reduce((a, b) => a + b, 0);

  const sourceIcons: Record<string, React.ReactNode> = {
    visitas: <HardHat className="w-4 h-4" />,
    tareas: <ListChecks className="w-4 h-4" />,
    personal: <Users className="w-4 h-4" />,
    novedades: <Newspaper className="w-4 h-4" />,
  };

  const sourceLabels: Record<string, string> = {
    visitas: 'VISITAS TÉCNICAS',
    tareas: 'TAREAS OPERATIVAS',
    personal: 'PERSONAL ACTIVO',
    novedades: 'NOVEDADES',
  };

  const formatValue = (val: any, key: string): string => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        if (val.length === 0) return '';
        if (key === 'comments')
          return `${val.length} comentario${val.length > 1 ? 's' : ''}`;
        if (key === 'subtasks') {
          const done = val.filter((s: any) => s.completed).length;
          return `${done}/${val.length}`;
        }
        if (key === 'attachments' || key === 'tags') return `${val.length}`;
        return `${val.length} elemento(s)`;
      }
      if (key === 'createdAt' || key === 'timestamp') {
        try {
          return new Date(val).toLocaleString('es-ES');
        } catch {
          return String(val).slice(0, 30);
        }
      }
      return JSON.stringify(val).slice(0, 40);
    }
    if (key === 'createdAt' || key === 'timestamp') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toLocaleString('es-ES');
      } catch {
        /* fall through */
      }
    }
    return String(val);
  };

  const getColumnConfig = (
    key: string
  ): { field: string; label: string; width: string }[] => {
    const configs: Record<string, { field: string; label: string; width: string }[]> = {
      visitas: [
        { field: 'fecha', label: 'FECHA', width: 'w-24' },
        { field: 'hora', label: 'HORA', width: 'w-16' },
        { field: 'origen', label: 'ORIGEN', width: 'min-w-[100px]' },
        { field: 'destino', label: 'DESTINO', width: 'min-w-[100px]' },
        { field: 'responsable', label: 'RESPONSABLE', width: 'min-w-[120px]' },
        { field: 'observaciones', label: 'OBSERVACIONES', width: 'min-w-[180px]' },
        { field: 'comments', label: 'COMENTARIOS', width: 'w-24' },
      ],
      tareas: [
        { field: 'title', label: 'TÍTULO', width: 'min-w-[150px]' },
        { field: 'priority', label: 'PRIORIDAD', width: 'w-20' },
        { field: 'status', label: 'ESTADO', width: 'w-24' },
        { field: 'dueDate', label: 'VENCIMIENTO', width: 'w-24' },
        { field: 'description', label: 'DESCRIPCIÓN', width: 'min-w-[180px]' },
        { field: 'tags', label: 'ETIQUETAS', width: 'w-28' },
        { field: 'subtasks', label: 'SUBTAREAS', width: 'w-24' },
        { field: 'comments', label: 'COMENTARIOS', width: 'w-24' },
        { field: 'attachments', label: 'ADJUNTOS', width: 'w-20' },
        { field: 'recurrence', label: 'RECURRENCIA', width: 'w-24' },
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
        { field: 'attachments', label: 'ADJUNTOS', width: 'w-20' },
      ],
    };
    return configs[key] || [];
  };

  const getPriorityBadge = (val: string) => {
    if (val === 'alta') return 'bg-[#ef4444] text-white';
    if (val === 'media') return 'bg-[#f59e0b] text-white';
    if (val === 'baja') return 'bg-[#10b981] text-white';
    return 'bg-steel-200 text-steel-700';
  };

  const getStatusBadge = (val: string) => {
    if (val === 'completado' || val === 'Activo' || val === 'Operativo')
      return 'bg-[#10b981] text-white';
    if (val === 'pendiente' || val === 'en_proceso' || val === 'Mantenimiento')
      return 'bg-[#3b82f6] text-white';
    if (val === 'eliminado' || val === 'Inactivo')
      return 'bg-[#ef4444] text-white';
    return 'bg-steel-200 text-steel-700';
  };

  return (
    <div className="font-sans max-w-7xl mx-auto relative z-[1]">
      {/* ── Page Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="mb-8"
      >
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-navy-400" />
              <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-navy-400">
                Módulo de Reportes
              </span>
            </div>
            <h1 className="text-3xl lg:text-4xl font-extrabold text-navy-900 font-display tracking-tight leading-tight">
              Generación de
              <span className="block bg-gradient-to-r from-navy-600 to-navy-400 bg-clip-text text-transparent">
                Reportes
              </span>
            </h1>
          </div>
          {totalRecords > 0 && showPreview && (
            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-white rounded-xl px-4 py-2.5 shadow-[0_1px_4px_rgba(10,22,40,0.06)] border border-steel-100"
            >
              <BarChart3 className="w-4 h-4 text-navy-500" />
              <span className="text-sm font-bold text-navy-900">
                {totalRecords}
              </span>
              <span className="text-xs text-steel-500">registros</span>
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* ── Stat Cards ── */}
      {showPreview && totalRecords > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Object.entries(dataCounts).map(([key, count], i) => {
            const accents: Record<string, string> = {
              visitas: 'bg-emerald-500',
              tareas: 'bg-blue-500',
              personal: 'bg-violet-500',
              novedades: 'bg-amber-500',
            };
            return (
              <StatCard
                key={key}
                icon={sourceIcons[key] || <Database className="w-5 h-5" />}
                label={sourceLabels[key] || key}
                value={count}
                accent={accents[key] || 'bg-navy-500'}
                delay={i * 0.08}
              />
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Configuration Panel ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-2xl border border-steel-100 shadow-[0_1px_3px_rgba(10,22,40,0.04),0_4px_16px_rgba(10,22,40,0.03)] overflow-hidden">
            {/* Panel header */}
            <div className="px-6 py-4 border-b border-steel-100 bg-gradient-to-r from-navy-950 to-navy-900">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white uppercase tracking-wider">
                    Configuración
                  </h2>
                  <p className="text-[11px] text-white/50">
                    Personalizá tu reporte
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-5">
              {/* Data source */}
              <div>
                <FieldLabel>Fuente de Datos</FieldLabel>
                <SelectField value={dataSource} onChange={setDataSource}>
                  <option value="todas">Todas las fuentes</option>
                  <option value="visitas">Visitas Técnicas</option>
                  <option value="tareas">Tareas Operativas</option>
                  <option value="personal">Personal Activo</option>
                  <option value="novedades">Novedades</option>
                </SelectField>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-2 gap-3">
                <DateField
                  value={dateFrom}
                  onChange={setDateFrom}
                  label="Desde"
                />
                <DateField value={dateTo} onChange={setDateTo} label="Hasta" />
              </div>

              {/* Sort */}
              <div>
                <FieldLabel>Ordenar por</FieldLabel>
                <SelectField value={sortBy} onChange={setSortBy}>
                  <option value="fecha_desc">Fecha (Más reciente)</option>
                  <option value="fecha_asc">Fecha (Más antiguo)</option>
                  <option value="prioridad">Prioridad (Alta a Baja)</option>
                </SelectField>
              </div>

              {/* Format */}
              <div>
                <FieldLabel>Formato</FieldLabel>
                <div className="flex gap-2">
                  <FormatButton
                    format="pdf"
                    active={format === 'pdf'}
                    onClick={() => setFormat('pdf')}
                    icon={<FileText className="w-4 h-4" />}
                    label="PDF"
                    color="bg-navy-800"
                  />
                  <FormatButton
                    format="excel"
                    active={format === 'excel'}
                    onClick={() => setFormat('excel')}
                    icon={<FileSpreadsheet className="w-4 h-4" />}
                    label="Excel"
                    color="bg-emerald-600"
                  />
                  <FormatButton
                    format="json"
                    active={format === 'json'}
                    onClick={() => setFormat('json')}
                    icon={<FileJson className="w-4 h-4" />}
                    label="JSON"
                    color="bg-violet-600"
                  />
                </div>
              </div>

              {/* Generate button */}
              <button
                onClick={handleGenerateReport}
                disabled={isGenerating}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-navy-800 to-navy-900 text-white font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 shadow-[0_4px_16px_rgba(10,22,40,0.20)] hover:shadow-[0_6px_24px_rgba(10,22,40,0.28)] hover:scale-[1.01] active:scale-[0.99] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <Download className="w-4 h-4" />{' '}
                {isGenerating ? 'Generando...' : 'Generar Reporte'}
              </button>

              {/* Preview button */}
              <button
                onClick={loadPreview}
                disabled={isLoadingPreview}
                className="w-full py-3 rounded-xl bg-white text-navy-800 border border-steel-200 font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-2 hover:bg-steel-50 hover:border-navy-300 transition-all shadow-[0_1px_3px_rgba(10,22,40,0.04)] disabled:opacity-50 text-sm"
              >
                <Eye className="w-4 h-4" />{' '}
                {isLoadingPreview ? 'Cargando...' : 'Vista Previa'}
              </button>
            </div>
          </div>
        </motion.div>

        {/* ── Preview Panel ── */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {showPreview ? (
              <motion.div
                key="preview"
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white rounded-2xl border border-steel-100 shadow-[0_1px_3px_rgba(10,22,40,0.04),0_4px_16px_rgba(10,22,40,0.03)] overflow-hidden"
              >
                {/* Preview header */}
                <div className="px-6 py-4 border-b border-steel-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-navy-50 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-navy-600" />
                    </div>
                    <div>
                      <h2 className="text-sm font-bold text-navy-900 uppercase tracking-wider">
                        Vista Previa
                      </h2>
                      <p className="text-[11px] text-steel-400">
                        Datos cargados correctamente
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] text-steel-400">
                    <Clock className="w-3 h-3" />
                    <span>Última carga: {new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>

                {/* Data tables */}
                <div className="p-6 space-y-8 max-h-[640px] overflow-y-auto">
                  {Object.entries(dataPreview).map(([key, records]) => {
                    const columns = getColumnConfig(key);
                    const hasColumns = columns.length > 0;

                    return (
                      <div key={key}>
                        <div className="flex items-center justify-between mb-3">
                          <h3 className="text-xs font-bold uppercase tracking-wider text-navy-800 flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-navy-50 text-navy-600">
                              {sourceIcons[key] || (
                                <Database className="w-3.5 h-3.5" />
                              )}
                            </span>
                            {sourceLabels[key] || key.toUpperCase()}
                          </h3>
                          <span className="text-[11px] font-semibold text-steel-400 bg-steel-50 px-2.5 py-1 rounded-lg">
                            {records.length} registro
                            {records.length !== 1 ? 's' : ''}
                          </span>
                        </div>

                        {records.length > 0 ? (
                          <div className="overflow-x-auto rounded-xl border border-steel-100">
                            {hasColumns ? (
                              <table className="w-full text-left border-collapse">
                                <thead>
                                  <tr className="bg-navy-950 text-white">
                                    <th className="p-3 text-[10px] font-bold uppercase tracking-wider w-10 opacity-60">
                                      #
                                    </th>
                                    {columns.map((col) => (
                                      <th
                                        key={col.field}
                                        className={`p-3 text-[10px] font-bold uppercase tracking-wider ${col.width}`}
                                      >
                                        {col.label}
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {records.slice(0, 8).map((record, idx) => (
                                    <tr
                                      key={idx}
                                      className={`border-t border-steel-100 ${
                                        idx % 2 === 0
                                          ? 'bg-steel-50/60'
                                          : 'bg-white'
                                      } hover:bg-navy-50/40 transition-colors`}
                                    >
                                      <td className="p-3 text-xs font-bold text-steel-300">
                                        {idx + 1}
                                      </td>
                                      {columns.map((col) => {
                                        const rawVal = record[col.field];
                                        const displayVal = formatValue(
                                          rawVal,
                                          col.field
                                        );
                                        const isBadge =
                                          col.field === 'priority' ||
                                          col.field === 'status';
                                        const isCount =
                                          col.field === 'comments' ||
                                          col.field === 'subtasks' ||
                                          col.field === 'attachments';

                                        return (
                                          <td key={col.field} className="p-3">
                                            {isBadge &&
                                            typeof rawVal === 'string' &&
                                            rawVal ? (
                                              <span
                                                className={`inline-block px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-md ${
                                                  col.field === 'priority'
                                                    ? getPriorityBadge(rawVal)
                                                    : getStatusBadge(rawVal)
                                                }`}
                                              >
                                                {rawVal.replace('_', ' ')}
                                              </span>
                                            ) : isCount &&
                                              Array.isArray(rawVal) &&
                                              rawVal.length > 0 ? (
                                              <span className="inline-block px-2 py-0.5 text-[10px] font-bold tracking-wider border border-steel-200 bg-white rounded-md">
                                                {col.field === 'subtasks'
                                                  ? displayVal
                                                  : `${rawVal.length}`}
                                              </span>
                                            ) : (
                                              <span className="text-xs font-medium truncate block max-w-[250px] text-steel-700">
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
                                  <tr className="bg-navy-950 text-white">
                                    <th className="p-3 text-[10px] font-bold uppercase tracking-wider w-10 opacity-60">
                                      #
                                    </th>
                                    {Object.keys(records[0])
                                      .slice(0, 6)
                                      .map((header) => (
                                        <th
                                          key={header}
                                          className="p-3 text-[10px] font-bold uppercase tracking-wider min-w-[100px]"
                                        >
                                          {header}
                                        </th>
                                      ))}
                                  </tr>
                                </thead>
                                <tbody>
                                  {records.slice(0, 8).map((record, idx) => (
                                    <tr
                                      key={idx}
                                      className={`border-t border-steel-100 ${
                                        idx % 2 === 0
                                          ? 'bg-steel-50/60'
                                          : 'bg-white'
                                      }`}
                                    >
                                      <td className="p-3 text-xs font-bold text-steel-300">
                                        {idx + 1}
                                      </td>
                                      {Object.values(record)
                                        .slice(0, 6)
                                        .map((val: any, i) => (
                                          <td
                                            key={i}
                                            className="p-3 text-xs font-medium truncate max-w-[200px] text-steel-700"
                                          >
                                            {formatValue(
                                              val,
                                              Object.keys(record)[i]
                                            )}
                                          </td>
                                        ))}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                            {records.length > 8 && (
                              <div className="p-3 text-center text-[11px] font-bold uppercase tracking-wider text-steel-400 border-t border-steel-100 bg-steel-50/40">
                                Mostrando 8 de {records.length} registros
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-xs font-bold uppercase text-steel-300 p-6 text-center border-2 border-dashed border-steel-200 bg-steel-50/30 rounded-xl">
                            Sin datos
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-white rounded-2xl border border-steel-100 shadow-[0_1px_3px_rgba(10,22,40,0.04),0_4px_16px_rgba(10,22,40,0.03)] p-16 flex flex-col items-center justify-center text-center"
              >
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-navy-50 to-steel-50 flex items-center justify-center mb-5">
                  <BarChart3 className="w-7 h-7 text-navy-300" />
                </div>
                <h3 className="text-base font-extrabold text-navy-900 font-display uppercase tracking-wider mb-1">
                  Sin Vista Previa
                </h3>
                <p className="text-sm text-steel-500 max-w-sm mb-6 leading-relaxed">
                  Configurá los filtros y hacé clic en{' '}
                  <span className="font-semibold text-navy-600">
                    "Vista Previa"
                  </span>{' '}
                  para ver los datos antes de generar el reporte.
                </p>
                <button
                  onClick={loadPreview}
                  className="px-6 py-3 bg-gradient-to-r from-navy-700 to-navy-800 text-white rounded-xl font-bold uppercase text-xs tracking-wider flex items-center gap-2 shadow-[0_4px_12px_rgba(10,22,40,0.15)] hover:shadow-[0_6px_20px_rgba(10,22,40,0.22)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                >
                  <Eye className="w-4 h-4" /> Cargar Vista Previa
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
