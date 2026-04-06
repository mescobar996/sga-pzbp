import { FileText, Download, Database, Eye, BarChart3, Users, HardHat, ListChecks, Newspaper, ClipboardList } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '../db/client';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import { motion } from 'motion/react';
import { FormatSelector } from '../components/FormatSelector';
import { DateRangePicker } from '../components/DateRangePicker';

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
      const { data: docs, error } = await supabase.from(colName).select('*');
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
    if (dataSource === 'todas' || dataSource === 'diligenciamientos') data.diligenciamientos = await fetchCollection('diligenciamientos');

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

  const generatePDF = async (data: Record<string, any[]>) => {
    const totalVisitas = data.visitas?.length || 0;
    const totalTareas = data.tareas?.length || 0;
    const totalPersonal = data.personal?.length || 0;
    const totalNovedades = data.novedades?.length || 0;
    const totalDiligenciamientos = data.diligenciamientos?.length || 0;
    const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades + totalDiligenciamientos;
    const now = new Date().toLocaleString('es-ES');
    const dateStr = new Date().toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    // KPIs
    const tareasPendientes = data.tareas?.filter((t: any) => t.status === 'pendiente').length || 0;
    const tareasEnProceso = data.tareas?.filter((t: any) => t.status === 'en_proceso').length || 0;
    const tareasCompletadas = data.tareas?.filter((t: any) => t.status === 'completado').length || 0;
    const tareasAlta = data.tareas?.filter((t: any) => t.priority === 'alta' && t.status !== 'completado').length || 0;
    const tareasMedia =
      data.tareas?.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length || 0;
    const tareasBaja = data.tareas?.filter((t: any) => t.priority === 'baja' && t.status !== 'completado').length || 0;
    const tasaCompletitud = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

    // Analysis data
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

    const recentActivities: { date: string; type: string; detail: string; color: string }[] = [];
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
        date: t.createdAt ? new Date(t.createdAt).toLocaleDateString('es-ES') : 'N/A',
        type: 'TAREA',
        detail: t.title || 'Sin título',
        color: '#3b82f6',
      });
    });
    data.novedades?.slice(0, 2).forEach((n: any) => {
      recentActivities.push({
        date: n.createdAt ? new Date(n.createdAt).toLocaleDateString('es-ES') : 'N/A',
        type: 'NOVEDAD',
        detail: n.title || 'Sin título',
        color: '#8b5cf6',
      });
    });
    data.diligenciamientos?.slice(0, 2).forEach((d: any) => {
      recentActivities.push({
        date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('es-ES') : 'N/A',
        type: 'DILIGENCIA',
        detail: d.title || 'Sin título',
        color: '#f97316',
      });
    });
    recentActivities.sort((a, b) => {
      if (a.date === 'N/A' || b.date === 'N/A') return 0;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    // Style helpers
    const priorityColor = (p: string) => {
      if (p === 'alta') return '#e63b2e';
      if (p === 'media') return '#0055ff';
      if (p === 'baja') return '#00cc66';
      return '#6b7280';
    };

    const statusColor = (s: string) => {
      if (s === 'completado' || s === 'Activo' || s === 'Operativo') return '#00cc66';
      if (s === 'pendiente' || s === 'en_proceso' || s === 'Mantenimiento') return '#0055ff';
      if (s === 'eliminado' || s === 'Inactivo') return '#e63b2e';
      return '#6b7280';
    };

    const badge = (text: string, color: string) =>
      `<span style="display:inline-block;background:${color};color:#fff;padding:3px 8px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.03em;border:2px solid #1a1a1a;">${text}</span>`;

    // Modern donut chart
    const donutChart = (segments: { label: string; value: number; color: string }[], title: string) => {
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
        </div>`,
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

    // Progress bar
    const progressBar = (label: string, value: number, max: number, color: string) => {
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

    // Section card
    const sectionCard = (title: string, subtitle: string, accent: string, content: string, icon?: string) => `
      <div style="margin-bottom:24px;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;page-break-inside:avoid;">
        <div style="background:linear-gradient(135deg, ${accent}, ${accent}dd);padding:16px 20px;display:flex;align-items:center;gap:12px;">
          ${icon ? `<span style="font-size:20px;">${icon}</span>` : ''}
          <div>
            <div style="font-size:15px;font-weight:800;color:#fff;text-transform:uppercase;letter-spacing:0.05em;">${title}</div>
            ${subtitle ? `<div style="font-size:12px;color:#ffffffcc;margin-top:2px;">${subtitle}</div>` : ''}
          </div>
        </div>
        <div style="padding:20px;background:#fafafa;">
          ${content}
        </div>
      </div>`;

    // Data card for individual records
    const dataCard = (
      title: string,
      num: number,
      accent: string,
      fields: { label: string; value: string }[],
      extras?: string,
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
          `,
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
          `,
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
          `,
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
          `,
            )
            .join('')}
        </div>`;
    };

    const tagsBlock = (tags: string[], accent: string) => {
      if (!tags || tags.length === 0) return '';
      return `
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
          ${tags.map((t) => `<span style="background:#eff6ff;color:${accent};padding:2px 8px;font-size:10px;font-weight:600;border-radius:9999px;">${t}</span>`).join('')}
        </div>`;
    };

    // KPI stat card
    const statCard = (label: string, value: string | number, icon: string, color: string) => `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;text-align:center;flex:1;min-width:120px;">
        <div style="font-size:24px;margin-bottom:4px;">${icon}</div>
        <div style="font-size:28px;font-weight:900;color:${color};">${value}</div>
        <div style="font-size:11px;font-weight:600;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;margin-top:4px;">${label}</div>
      </div>`;

    const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700;900&display=swap');
      * { margin: 0; padding: 0; box-sizing: border-box; text-transform: uppercase; }
      body { font-family: 'Inter', -apple-system, sans-serif; color: #1a1a1a; line-height: 1.5; background: #fff; }

      .cover {
        background: #f5f0e8;
        color: #1a1a1a;
        padding: 60px;
        min-height: 700px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        border-bottom: 4px solid #1a1a1a;
      }
      .cover-content { max-width: 700px; position: relative; z-index: 1; }
      .cover-badge {
        display: inline-block;
        background: #1a1a1a;
        color: #0055ff;
        padding: 6px 16px;
        font-size: 10px;
        font-weight: 700;
        letter-spacing: 0.15em;
        text-transform: uppercase;
        margin-bottom: 24px;
        border: 2px solid #1a1a1a;
      }
      .cover h1 {
        font-family: 'Space Grotesk', monospace;
        font-size: 52px;
        font-weight: 900;
        line-height: 1;
        letter-spacing: -0.02em;
        margin-bottom: 16px;
        color: #1a1a1a;
      }
      .cover h1 span { color: #0055ff; }
      .cover-accent { width: 80px; height: 6px; background: #1a1a1a; margin: 20px 0; }
      .cover-subtitle {
        font-size: 14px; font-weight: 600; color: #1a1a1a; margin-bottom: 40px;
        text-transform: uppercase; letter-spacing: 0.05em;
      }
      .stats-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 28px; }
      .stat-card {
        background: #fff; border: 3px solid #1a1a1a; padding: 16px 12px; text-align: center;
        box-shadow: 4px 4px 0px #1a1a1a;
      }
      .stat-icon { font-size: 22px; margin-bottom: 6px; }
      .stat-value { font-family: 'Space Grotesk', monospace; font-size: 32px; font-weight: 900; color: #1a1a1a; }
      .stat-label { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #1a1a1a; margin-top: 4px; opacity: 0.6; }
      .cover-footer {
        background: #fff; border: 3px solid #1a1a1a; padding: 20px 24px; display: flex;
        justify-content: space-between; align-items: center; box-shadow: 4px 4px 0px #1a1a1a;
      }
      .cover-footer-label { font-size: 9px; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.1em; font-weight: 700; opacity: 0.5; }
      .cover-footer-value { font-family: 'Space Grotesk', monospace; font-size: 14px; font-weight: 700; color: #1a1a1a; margin-top: 4px; }

      .section { padding: 36px 60px; }
      .section-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
      .section-accent { width: 8px; height: 32px; background: #1a1a1a; }
      .section-title { font-family: 'Space Grotesk', monospace; font-size: 18px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.03em; color: #1a1a1a; }
      .section-subtitle { font-size: 11px; color: #1a1a1a; margin-top: 2px; opacity: 0.5; font-weight: 600; }

      .donut-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-bottom: 20px; }
      .donut-card { background: #fff; border: 3px solid #1a1a1a; padding: 20px; box-shadow: 4px 4px 0px #1a1a1a; }
      .donut-title { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; color: #1a1a1a; margin-bottom: 14px; }

      .progress-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; }
      .progress-card { background: #fff; border: 3px solid #1a1a1a; padding: 20px; box-shadow: 4px 4px 0px #1a1a1a; }
      .progress-item { margin-bottom: 12px; }
      .progress-item:last-child { margin-bottom: 0; }
      .progress-header { display: flex; justify-content: space-between; margin-bottom: 4px; }
      .progress-label { font-size: 11px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; }
      .progress-value { font-size: 11px; font-weight: 900; color: #1a1a1a; font-family: 'Space Grotesk', monospace; }
      .progress-track { width: 100%; height: 10px; background: #f5f0e8; border: 2px solid #1a1a1a; overflow: hidden; }
      .progress-fill { height: 100%; }

      .completion-card { background: #fff; border: 3px solid #1a1a1a; padding: 20px; text-align: center; box-shadow: 4px 4px 0px #1a1a1a; }
      .completion-value { font-family: 'Space Grotesk', monospace; font-size: 52px; font-weight: 900; margin: 10px 0; }
      .completion-track { width: 100%; height: 14px; background: #f5f0e8; border: 2px solid #1a1a1a; overflow: hidden; margin: 10px 0; }
      .completion-fill { height: 100%; }
      .completion-stats { display: flex; justify-content: space-between; font-size: 10px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; }

      .overdue-card { background: #fff; border: 3px solid #e63b2e; padding: 20px; box-shadow: 4px 4px 0px #1a1a1a; margin-bottom: 20px; }
      .overdue-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
      .overdue-icon { font-size: 22px; }
      .overdue-title { font-family: 'Space Grotesk', monospace; font-size: 16px; font-weight: 900; color: #e63b2e; text-transform: uppercase; }
      .overdue-count { font-size: 11px; color: #e63b2e; font-weight: 600; }
      .overdue-table { width: 100%; border-collapse: collapse; border: 2px solid #1a1a1a; }
      .overdue-table th { padding: 10px 12px; font-size: 9px; font-weight: 700; color: #fff; text-align: left; text-transform: uppercase; letter-spacing: 0.05em; background: #1a1a1a; border: 1px solid #1a1a1a; }
      .overdue-table td { padding: 8px 12px; font-size: 11px; border: 1px solid #e5e5e5; }
      .overdue-table tr:nth-child(even) { background: #f5f0e8; }

      .badge { display: inline-block; padding: 3px 8px; font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.03em; color: #fff; border: 2px solid #1a1a1a; }

      .section-divider { display: flex; align-items: center; gap: 12px; margin-bottom: 18px; padding-bottom: 12px; border-bottom: 3px solid #1a1a1a; }
      .section-divider-accent { width: 8px; height: 24px; background: #1a1a1a; }
      .section-divider-title { font-family: 'Space Grotesk', monospace; font-size: 16px; font-weight: 900; text-transform: uppercase; color: #1a1a1a; }
      .section-divider-count { margin-left: auto; font-size: 10px; font-weight: 700; padding: 4px 12px; background: #fff; border: 2px solid #1a1a1a; box-shadow: 2px 2px 0px #1a1a1a; }
      .data-card { background: #fff; border: 3px solid #1a1a1a; border-left: 6px solid; padding: 16px; margin-bottom: 10px; page-break-inside: avoid; box-shadow: 3px 3px 0px #1a1a1a; }
      .data-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
      .data-card-title { font-size: 13px; font-weight: 700; color: #1a1a1a; }
      .data-card-number { font-family: 'Space Grotesk', monospace; font-size: 10px; font-weight: 700; padding: 2px 8px; background: #f5f0e8; border: 2px solid #1a1a1a; }
      .data-card-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px; }
      .data-card-field-label { font-size: 8px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #1a1a1a; opacity: 0.5; }
      .data-card-field-value { font-size: 11px; font-weight: 500; color: #1a1a1a; margin-top: 2px; }

      .data-card-extras { margin-top: 12px; padding-top: 12px; border-top: 2px solid #1a1a1a; }
      .extras-title { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; }
      .comment-item { background: #f5f0e8; border: 2px solid #1a1a1a; padding: 8px; margin-bottom: 4px; }
      .comment-author { font-size: 9px; font-weight: 700; color: #1a1a1a; opacity: 0.6; }
      .comment-text { font-size: 10px; color: #1a1a1a; margin-top: 2px; }
      .subtask-item { font-size: 10px; padding: 3px 0; display: flex; align-items: center; gap: 4px; font-weight: 500; }
      .attachment-item { font-size: 10px; color: #0055ff; padding: 2px 0; font-weight: 600; }
      .tag-item { display: inline-block; padding: 2px 6px; font-size: 8px; font-weight: 700; background: #f5f0e8; border: 2px solid #1a1a1a; margin: 2px; text-transform: uppercase; }

      .timeline { position: relative; padding-left: 20px; }
      .timeline::before { content: ''; position: absolute; left: 5px; top: 0; bottom: 0; width: 3px; background: #1a1a1a; }
      .timeline-item { position: relative; padding: 8px 0 8px 14px; }
      .timeline-dot { position: absolute; left: -18px; top: 12px; width: 10px; height: 10px; border: 2px solid #1a1a1a; background: #fff; }
      .timeline-content { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
      .timeline-type { font-size: 8px; font-weight: 700; padding: 2px 6px; color: #fff; text-transform: uppercase; border: 2px solid #1a1a1a; }
      .timeline-detail { font-size: 11px; font-weight: 600; color: #1a1a1a; }
      .timeline-date { font-size: 10px; color: #1a1a1a; opacity: 0.5; margin-left: auto; font-weight: 600; }

      .ranking-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
      .ranking-item { display: flex; align-items: center; gap: 8px; padding: 8px 0; }
      .ranking-number { width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 900; flex-shrink: 0; border: 2px solid #1a1a1a; font-family: 'Space Grotesk', monospace; }
      .ranking-name { flex: 1; font-size: 12px; font-weight: 600; color: #1a1a1a; }
      .ranking-count { font-size: 12px; font-weight: 700; font-family: 'Space Grotesk', monospace; }

      .report-footer { background: #f5f0e8; border-top: 3px solid #1a1a1a; padding: 24px 60px; text-align: center; }
      .report-footer-brand { font-family: 'Space Grotesk', monospace; font-size: 11px; font-weight: 700; color: #1a1a1a; text-transform: uppercase; letter-spacing: 0.05em; }
      .report-footer-date { font-size: 9px; color: #1a1a1a; opacity: 0.5; margin-top: 4px; font-weight: 600; }
    </style>
    </head>
    <body>
    <div style="width:100%;">
      <div class="cover">
        <div class="cover-content">
          <div class="cover-badge">Sistema de Gestión de Actividades</div>
          <h1>REPORTE<br/><span>COMPLETO</span></h1>
          <div class="cover-accent"></div>
          <p class="cover-subtitle">Prefectura Naval Argentina — SGA PZBP</p>
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-icon">📍</div><div class="stat-value">${totalVisitas}</div><div class="stat-label">Visitas</div></div>
            <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-value">${totalTareas}</div><div class="stat-label">Tareas</div></div>
            <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${totalPersonal}</div><div class="stat-label">Personal</div></div>
            <div class="stat-card"><div class="stat-icon">📰</div><div class="stat-value">${totalNovedades}</div><div class="stat-label">Novedades</div></div>
            <div class="stat-card"><div class="stat-icon">📋</div><div class="stat-value">${totalDiligenciamientos}</div><div class="stat-label">Diligencias</div></div>
          </div>
          <div class="cover-footer">
            <div><div class="cover-footer-label">Total de registros</div><div class="cover-footer-value" style="font-size:26px;">${totalRecords}</div></div>
            <div style="text-align:right;"><div class="cover-footer-label">Fecha de generación</div><div class="cover-footer-value">${dateStr}</div><div style="font-size:10px;color:#1a1a1a;opacity:0.5;margin-top:2px;">${now}</div></div>
          </div>
        </div>
      </div>

      ${
        totalRecords > 0
          ? `
      <div class="section">
        <div class="section-header">
          <div class="section-accent"></div>
          <div><div class="section-title">Indicadores Clave</div><div class="section-subtitle">Resumen general del sistema</div></div>
        </div>
        <div class="donut-grid">
          <div class="donut-card"><div class="donut-title">Estado de Tareas</div>
            ${donutChart(
              [
                { label: 'Pendientes', value: tareasPendientes, color: '#0055ff' },
                { label: 'En proceso', value: tareasEnProceso, color: '#f59e0b' },
                { label: 'Completadas', value: tareasCompletadas, color: '#00cc66' },
              ],
              'Estado de Tareas',
            )}
          </div>
          <div class="donut-card"><div class="donut-title">Prioridad Activa</div>
            ${donutChart(
              [
                { label: 'Alta', value: tareasAlta, color: '#e63b2e' },
                { label: 'Media', value: tareasMedia, color: '#0055ff' },
                { label: 'Baja', value: tareasBaja, color: '#00cc66' },
              ],
              'Prioridad Activa',
            )}
          </div>
        </div>
        <div class="progress-grid">
          <div class="progress-card"><div class="donut-title">Distribución por Fuente</div>
            ${progressBar('Visitas', totalVisitas, totalRecords, '#00cc66')}
            ${progressBar('Tareas', totalTareas, totalRecords, '#0055ff')}
            ${progressBar('Personal', totalPersonal, totalRecords, '#8b5cf6')}
            ${progressBar('Novedades', totalNovedades, totalRecords, '#f59e0b')}
            ${progressBar('Diligencias', totalDiligenciamientos, totalRecords, '#f97316')}
          </div>
          <div class="completion-card"><div class="donut-title">Tasa de Completitud</div>
            <div class="completion-value" style="color:${tasaCompletitud >= 70 ? '#00cc66' : tasaCompletitud >= 40 ? '#f59e0b' : '#e63b2e'};">${tasaCompletitud}%</div>
            <div class="completion-track"><div class="completion-fill" style="width:${tasaCompletitud}%;background:${tasaCompletitud >= 70 ? '#00cc66' : tasaCompletitud >= 40 ? '#f59e0b' : '#e63b2e'};"></div></div>
            <div class="completion-stats">
              <span>Pendientes: <strong style="color:#0055ff;">${tareasPendientes}</strong></span>
              <span>En proceso: <strong style="color:#f59e0b;">${tareasEnProceso}</strong></span>
              <span>Completadas: <strong style="color:#00cc66;">${tareasCompletadas}</strong></span>
            </div>
          </div>
        </div>
      </div>`
          : ''
      }

      ${
        overdueTasks.length > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="overdue-card">
          <div class="overdue-header">
            <span class="overdue-icon">⚠️</span>
            <div><div class="overdue-title">Tareas Vencidas</div><div class="overdue-count">${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} pendiente${overdueTasks.length > 1 ? 's' : ''} de plazo</div></div>
          </div>
          <table class="overdue-table"><thead><tr><th>Tarea</th><th>Vencimiento</th><th>Prioridad</th><th>Estado</th></tr></thead>
            <tbody>${overdueTasks.map((t: any) => `<tr><td style="font-weight:600;">${t.title || 'Sin título'}</td><td style="color:#e63b2e;font-weight:600;">${t.dueDate || 'N/A'}</td><td>${badge(((t.priority || 'N/A') as string).toUpperCase(), priorityColor(t.priority))}</td><td>${badge(((t.status || 'N/A') as string).toUpperCase().replace('_', ' '), statusColor(t.status))}</td></tr>`).join('')}</tbody>
          </table>
        </div>
      </div>`
          : ''
      }

      ${
        topDestinations.length > 0 || topResponsables.length > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-header"><div class="section-accent"></div><div><div class="section-title">Análisis de Visitas</div></div></div>
        <div class="ranking-grid">
          ${
            topDestinations.length > 0
              ? `<div><div class="donut-title">Destinos más frecuentes</div>
            ${topDestinations.map(([dest, count], i) => `<div class="ranking-item" style="${i < topDestinations.length - 1 ? 'border-bottom:2px solid #f5f0e8;' : ''}"><div class="ranking-number" style="background:#fff;color:#0055ff;">${i + 1}</div><div class="ranking-name">${dest}</div><div class="ranking-count" style="color:#0055ff;">${count} visita${count > 1 ? 's' : ''}</div></div>`).join('')}
          </div>`
              : ''
          }
          ${
            topResponsables.length > 0
              ? `<div><div class="donut-title">Top responsables</div>
            ${topResponsables.map(([resp, count], i) => `<div class="ranking-item" style="${i < topResponsables.length - 1 ? 'border-bottom:2px solid #f5f0e8;' : ''}"><div class="ranking-number" style="background:#fff;color:#00cc66;">${i + 1}</div><div class="ranking-name">${resp}</div><div class="ranking-count" style="color:#00cc66;">${count} visita${count > 1 ? 's' : ''}</div></div>`).join('')}
          </div>`
              : ''
          }
        </div>
      </div>`
          : ''
      }

      ${
        recentActivities.length > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-header"><div class="section-accent" style="background:#00cc66;"></div><div><div class="section-title">Actividad Reciente</div></div></div>
        <div class="timeline">
          ${recentActivities
            .slice(0, 8)
            .map(
              (act, i) =>
                `<div class="timeline-item" style="${i < 7 ? 'border-bottom:2px solid #f5f0e8;' : ''}"><div class="timeline-dot" style="background:${act.color};"></div><div class="timeline-content"><span class="timeline-type" style="background:${act.color};">${act.type}</span><span class="timeline-detail">${act.detail}</span><span class="timeline-date">${act.date}</span></div></div>`,
            )
            .join('')}
        </div>
      </div>`
          : ''
      }

      ${
        totalVisitas > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-divider"><div class="section-divider-accent" style="background:#00cc66;"></div><div class="section-divider-title">Visitas Técnicas</div><div class="section-divider-count">${totalVisitas} registros</div></div>
        ${data.visitas
          .map((v: any, idx: number) =>
            dataCard(
              `${v.origen || 'N/A'} → ${v.destino || 'N/A'}`,
              idx + 1,
              '#00cc66',
              [
                { label: 'Fecha', value: v.fecha || 'N/A' },
                { label: 'Hora', value: v.hora || 'N/A' },
                { label: 'Responsable', value: v.responsable || 'N/A' },
                { label: 'Origen', value: v.origen || 'N/A' },
                { label: 'Destino', value: v.destino || 'N/A' },
                { label: 'Observaciones', value: v.observaciones || '—' },
              ],
              commentsBlock(v.comments, '#00cc66'),
            ),
          )
          .join('')}
      </div>`
          : ''
      }

      ${
        totalTareas > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-divider"><div class="section-divider-accent" style="background:#0055ff;"></div><div class="section-divider-title">Tareas Operativas</div><div class="section-divider-count">${totalTareas} registros</div></div>
        ${data.tareas
          .map((t: any, idx: number) => {
            const accent = t.priority === 'alta' ? '#e63b2e' : t.priority === 'media' ? '#0055ff' : '#00cc66';
            return dataCard(
              t.title || 'Sin título',
              idx + 1,
              accent,
              [
                {
                  label: 'Prioridad',
                  value: badge(((t.priority || 'N/A') as string).toUpperCase(), priorityColor(t.priority)),
                },
                {
                  label: 'Estado',
                  value: badge(((t.status || 'N/A') as string).toUpperCase().replace('_', ' '), statusColor(t.status)),
                },
                { label: 'Vencimiento', value: t.dueDate || 'No definida' },
                { label: 'Creada', value: t.createdAt ? new Date(t.createdAt).toLocaleString('es-ES') : 'N/A' },
                {
                  label: 'Recurrencia',
                  value: (t.recurrence && t.recurrence !== 'none' ? t.recurrence : '—').toUpperCase(),
                },
                { label: 'Descripción', value: t.description || '—' },
              ],
              tagsBlock(t.tags || [], accent) +
                subtasksBlock(t.subtasks, accent) +
                commentsBlock(t.comments, accent) +
                attachmentsBlock(t.attachments, accent),
            );
          })
          .join('')}
      </div>`
          : ''
      }

      ${
        totalPersonal > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-divider"><div class="section-divider-accent" style="background:#8b5cf6;"></div><div class="section-divider-title">Personal Activo</div><div class="section-divider-count">${totalPersonal} registros</div></div>
        ${data.personal
          .map((p: any, idx: number) => {
            const accent = p.status === 'Activo' ? '#00cc66' : '#e63b2e';
            return dataCard(p.name || 'Sin nombre', idx + 1, accent, [
              { label: 'Nombre', value: p.name || 'N/A' },
              { label: 'Rol', value: p.role || 'N/A' },
              { label: 'Estado', value: badge((p.status || 'N/A').toUpperCase(), statusColor(p.status)) },
            ]);
          })
          .join('')}
      </div>`
          : ''
      }

      ${
        totalNovedades > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-divider"><div class="section-divider-accent" style="background:#f59e0b;"></div><div class="section-divider-title">Novedades</div><div class="section-divider-count">${totalNovedades} registros</div></div>
        ${data.novedades
          .map((n: any, idx: number) =>
            dataCard(
              n.title || 'Sin título',
              idx + 1,
              '#f59e0b',
              [
                { label: 'Fecha', value: n.createdAt ? new Date(n.createdAt).toLocaleString('es-ES') : 'N/A' },
                { label: 'Autor', value: n.authorName || 'N/A' },
                { label: 'Título', value: n.title || 'Sin título' },
                { label: 'Contenido', value: n.content || '—' },
              ],
              attachmentsBlock(n.attachments, '#f59e0b'),
            ),
          )
          .join('')}
      </div>`
          : ''
      }

      ${
        totalDiligenciamientos > 0
          ? `
      <div class="section" style="padding-top:0;">
        <div class="section-divider"><div class="section-divider-accent" style="background:#f97316;"></div><div class="section-divider-title">Diligenciamientos</div><div class="section-divider-count">${totalDiligenciamientos} registros</div></div>
        ${data.diligenciamientos
          .map((d: any, idx: number) =>
            dataCard(
              d.title || 'Sin título',
              idx + 1,
              '#f97316',
              [
                { label: 'Fecha', value: d.fecha ? new Date(d.fecha + 'T00:00:00').toLocaleDateString('es-ES') : (d.createdAt ? new Date(d.createdAt).toLocaleString('es-ES') : 'N/A') },
                { label: 'Autor', value: d.authorName || 'N/A' },
                { label: 'Título', value: d.title || 'Sin título' },
                { label: 'Detalle', value: d.content || '—' },
              ],
              attachmentsBlock(d.attachments, '#f97316'),
            ),
          )
          .join('')}
      </div>`
          : ''
      }

      <div class="report-footer">
        <div class="report-footer-brand">SGA PZBP — Prefectura Naval Argentina</div>
        <div class="report-footer-date">Generado el ${now}</div>
      </div>
    </div>
    </body>
    </html>`;

    // Create visible overlay with preview
    const overlay = document.createElement('div');
    overlay.id = 'pdf-overlay';
    overlay.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;background:#f9fafb;z-index:99999;overflow-y:auto;font-family:system-ui,-apple-system,sans-serif;';
    overlay.innerHTML = `
      <div style="position:sticky;top:0;z-index:10;background:#fff;padding:16px 24px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e5e7eb;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
        <div>
          <div style="font-size:16px;font-weight:800;color:#111827;">VISTA PREVIA DEL REPORTE</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px;">Revisá y descargá el PDF</div>
        </div>
        <div style="display:flex;gap:10px;">
          <button id="pdf-download-btn" style="padding:10px 20px;background:linear-gradient(135deg, #3b82f6, #1d4ed8);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;gap:6px;">⬇ Descargar PDF</button>
          <button id="pdf-cancel-btn" style="padding:10px 20px;background:#fff;color:#ef4444;border:1px solid #e5e7eb;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Cancelar</button>
        </div>
      </div>
      <div style="max-width:794px;margin:24px auto;background:#fff;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);border-radius:12px;overflow:hidden;" id="pdf-content">
        ${htmlContent}
      </div>
    `;
    document.body.appendChild(overlay);

    const downloadBtn = document.getElementById('pdf-download-btn') as HTMLButtonElement;
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

            ctx.drawImage(canvas, 0, yOffset, imgWidth, sliceHeight, 0, 0, imgWidth, sliceHeight);

            const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
            const scaledPageHeight = (sliceHeight / imgWidth) * pdfWidth;

            if (pageNum > 0) pdf.addPage();
            pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, scaledPageHeight);

            yOffset += sliceHeight;
            pageNum++;
          }

          cleanup();
          pdf.save(`Reporte_Completo_${new Date().toISOString().split('T')[0]}.pdf`);
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
      { columns: { key: string; header: string; width: number }[]; color: { header: string; altRow: string } }
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
        color: { header: '00cc66', altRow: 'f0fdf4' },
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
        color: { header: '0055ff', altRow: 'eff6ff' },
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
      diligenciamientos: 'DILIGENCIAMIENTOS',
    };

    const totalVisitas = data.visitas?.length || 0;
    const totalTareas = data.tareas?.length || 0;
    const totalPersonal = data.personal?.length || 0;
    const totalNovedades = data.novedades?.length || 0;
    const totalDiligenciamientos = data.diligenciamientos?.length || 0;
    const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades + totalDiligenciamientos;
    const tareasCompletadas = data.tareas?.filter((t: any) => t.status === 'completado').length || 0;
    const tasaCompletitud = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
    const tareasVencidas =
      data.tareas?.filter((t: any) => {
        if (!t.dueDate || t.status === 'completado') return false;
        return new Date(t.dueDate) < new Date();
      }).length || 0;

    const resumenData = [
      { A: 'REPORTE SGA PZBP — PREFECTURA NAVAL ARGENTINA' },
      {},
      { A: 'RESUMEN GENERAL' },
      { A: `Fecha de generación:`, B: new Date().toLocaleString('es-ES') },
      {
        A: `Filtro de datos:`,
        B: dataSource === 'todas' ? 'Todas las fuentes' : sheetLabels[dataSource] || dataSource,
      },
      { A: `Período:`, B: `${dateFrom || 'Sin límite'} — ${dateTo || 'Sin límite'}` },
      {},
      { A: 'TOTAL DE REGISTROS', B: totalRecords },
      {},
      { A: 'Visitas Técnicas', B: totalVisitas },
      { A: 'Tareas Operativas', B: totalTareas },
      { A: 'Personal Activo', B: totalPersonal },
      { A: 'Novedades', B: totalNovedades },
      {},
      { A: 'INDICADORES' },
      { A: 'Tasa de completitud', B: `${tasaCompletitud}%` },
      { A: 'Tareas completadas', B: tareasCompletadas },
      { A: 'Tareas vencidas', B: tareasVencidas },
    ];

    const resumenWs = XLSX.utils.json_to_sheet(resumenData, { skipHeader: true });
    resumenWs['!cols'] = [{ wch: 28 }, { wch: 40 }];
    resumenWs['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    XLSX.utils.book_append_sheet(workbook, resumenWs, 'RESUMEN');

    Object.keys(data).forEach((key) => {
      const records = data[key];
      const config = sheetConfigs[key];
      if (!config) return;

      const worksheetData: any[] = [];

      worksheetData.push({ A: sheetLabels[key] || key.toUpperCase() });
      worksheetData.push({ A: `Generado: ${new Date().toLocaleString('es-ES')}` });
      worksheetData.push({ A: `Total de registros: ${records.length}` });
      worksheetData.push({});

      if (records.length > 0) {
        const headerRow: Record<string, string> = {};
        config.columns.forEach((col, idx) => {
          headerRow[String.fromCharCode(65 + idx)] = col.header;
        });
        worksheetData.push(headerRow);

        records.forEach((record) => {
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
                  val = `${val.length} ELEMENTO(S)`;
                }
              } else {
                val = JSON.stringify(val).slice(0, 40);
              }
            }
            if (col.key === 'createdAt' || col.key === 'timestamp' || col.key === 'fecha' || col.key === 'dueDate') {
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

      const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });

      const wscols = config.columns.map((col) => ({ wch: col.width }));
      worksheet['!cols'] = wscols;

      worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: config.columns.length - 1 } }];

      worksheet['!autofilter'] = {
        ref: `A${5}:${String.fromCharCode(64 + config.columns.length)}${5 + records.length}`,
      };

      XLSX.utils.book_append_sheet(workbook, worksheet, sheetLabels[key] || key.toUpperCase());
    });

    if (workbook.SheetNames.length === 1) {
      const worksheet = XLSX.utils.json_to_sheet([{ message: 'Sin datos para los filtros seleccionados' }]);
      XLSX.utils.book_append_sheet(workbook, worksheet, 'REPORTE');
    }

    XLSX.writeFile(workbook, `Reporte_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const generateJSON = (data: Record<string, any[]>) => {
    const totalVisitas = data.visitas?.length || 0;
    const totalTareas = data.tareas?.length || 0;
    const totalPersonal = data.personal?.length || 0;
    const totalNovedades = data.novedades?.length || 0;
    const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades;
    const tareasPendientes = data.tareas?.filter((t: any) => t.status === 'pendiente').length || 0;
    const tareasEnProceso = data.tareas?.filter((t: any) => t.status === 'en_proceso').length || 0;
    const tareasCompletadas = data.tareas?.filter((t: any) => t.status === 'completado').length || 0;
    const tareasAlta = data.tareas?.filter((t: any) => t.priority === 'alta' && t.status !== 'completado').length || 0;
    const tareasMedia =
      data.tareas?.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length || 0;
    const tareasBaja = data.tareas?.filter((t: any) => t.priority === 'baja' && t.status !== 'completado').length || 0;
    const tasaCompletitud = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;
    const tareasVencidas =
      data.tareas?.filter((t: any) => {
        if (!t.dueDate || t.status === 'completado') return false;
        return new Date(t.dueDate) < new Date();
      }).length || 0;

    const reportMetadata = {
      version: '2.0.0',
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
        totalRegistros: totalRecords,
        visitas: totalVisitas,
        tareas: totalTareas,
        personal: totalPersonal,
        novedades: totalNovedades,
      },
      kpis: {
        tasaCompletitud: `${tasaCompletitud}%`,
        tareasPendientes,
        tareasEnProceso,
        tareasCompletadas,
        tareasVencidas,
        prioridadAlta: tareasAlta,
        prioridadMedia: tareasMedia,
        prioridadBaja: tareasBaja,
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
                if (v === null || v === undefined) {
                  cleaned[k] = null;
                } else if (typeof v === 'object' && !(v instanceof Date)) {
                  cleaned[k] = v;
                } else {
                  cleaned[k] = v;
                }
              });
              return cleaned;
            }),
          },
        ]),
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
        toast.error('No hay datos para los filtros seleccionados', { id: 'report-gen' });
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

      toast.success(`Reporte generado con éxito en formato ${format.toUpperCase()}`, { id: 'report-gen' });
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
    if (typeof val === 'object') {
      if (Array.isArray(val)) {
        if (val.length === 0) return '';
        if (key === 'comments') return `${val.length} COMENTARIO${val.length > 1 ? 'S' : ''}`;
        if (key === 'subtasks') {
          const done = val.filter((s: any) => s.completed).length;
          return `${done}/${val.length}`;
        }
        if (key === 'attachments' || key === 'tags') return `${val.length}`;
        return `${val.length} ELEMENTO(S)`;
      }
      if (key === 'createdAt' || key === 'timestamp') {
        try {
          return new Date(val).toLocaleString('es-ES');
        } catch {
          return String(val).slice(0, 30);
        }
      }
      return JSON.stringify(val).slice(0, 40).toUpperCase();
    }
    if (key === 'createdAt' || key === 'timestamp') {
      try {
        const d = new Date(val);
        if (!isNaN(d.getTime())) return d.toLocaleString('es-ES');
      } catch {
        /* fall through */
      }
    }
    return String(val).toUpperCase();
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
      diligenciamientos: [
        { field: 'fecha', label: 'FECHA', width: 'w-32' },
        { field: 'title', label: 'TÍTULO', width: 'min-w-[150px]' },
        { field: 'authorName', label: 'AUTOR', width: 'w-36' },
        { field: 'content', label: 'DETALLE', width: 'min-w-[220px]' },
        { field: 'attachments', label: 'ADJUNTOS', width: 'w-20' },
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
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-3">
        <h1 className="text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
          Generación de Reportes
        </h1>
        {totalRecords > 0 && showPreview && (
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[#0055ff]" />
            <span className="text-sm font-black uppercase">{totalRecords} REGISTROS</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-1 bg-white border-4 border-[#1a1a1a] p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,0.3)] h-fit">
          <h2 className="text-lg font-black uppercase mb-6 font-['Space_Grotesk'] border-b-4 border-[#1a1a1a] pb-2">
            Configuración
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                <Database className="w-4 h-4" /> Fuente de Datos
              </label>
              <select
                value={dataSource}
                onChange={(e) => setDataSource(e.target.value)}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm"
              >
                <option value="todas">Todas las fuentes</option>
                <option value="visitas">Visitas Técnicas</option>
                <option value="tareas">Tareas Operativas</option>
                <option value="personal">Personal Activo</option>
                <option value="novedades">Novedades</option>
                <option value="diligenciamientos">Diligenciamientos</option>
              </select>
            </div>

            <DateRangePicker
              dateFrom={dateFrom}
              onDateFromChange={setDateFrom}
              dateTo={dateTo}
              onDateToChange={setDateTo}
            />

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2">Ordenar por</label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="w-full p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm"
              >
                <option value="fecha_desc">Fecha (Más reciente)</option>
                <option value="fecha_asc">Fecha (Más antiguo)</option>
                <option value="prioridad">Prioridad (Alta a Baja)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-black uppercase tracking-widest mb-2">Formato</label>
              <FormatSelector value={format} onChange={setFormat} />
            </div>

            <button
              onClick={handleGenerateReport}
              disabled={isGenerating}
              className="w-full py-3.5 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white font-black uppercase tracking-widest hover:bg-white hover:text-[#1a1a1a] transition-all flex items-center justify-center gap-2 shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-sm"
            >
              <Download className="w-5 h-5" /> {isGenerating ? 'Generando...' : 'Generar Reporte'}
            </button>

            <button
              onClick={loadPreview}
              disabled={isLoadingPreview}
              className="w-full py-3 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#f5f0e8] transition-all flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 text-sm"
            >
              <Eye className="w-4 h-4" /> {isLoadingPreview ? 'CARGANDO...' : 'VISTA PREVIA'}
            </button>
          </div>
        </div>

        {/* Preview Panel */}
        <div className="lg:col-span-2">
          {showPreview ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] p-6"
            >
              <h2 className="text-lg font-black uppercase mb-4 font-['Space_Grotesk'] border-b-2 border-[#1a1a1a] pb-2">
                VISTA PREVIA DE DATOS
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
                {Object.entries(dataCounts).map(([key, count]) => (
                  <div key={key} className="p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] flex items-center gap-3">
                    <div className="p-2 bg-[#0055ff] text-white border-2 border-[#1a1a1a]">
                      {sourceIcons[key] || <Database className="w-4 h-4" />}
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase opacity-60">{key}</p>
                      <p className="text-xl font-black font-['Space_Grotesk']">{count}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-8 max-h-[600px] overflow-y-auto pr-2">
                {Object.entries(dataPreview).map(([key, records]) => {
                  const columns = getColumnConfig(key);
                  const hasColumns = columns.length > 0;

                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="text-sm font-black uppercase flex items-center gap-2">
                          {sourceIcons[key] || <Database className="w-4 h-4" />}
                          {sourceLabels[key] || key.toUpperCase()}
                        </h3>
                        <span className="text-xs font-bold opacity-50 bg-[#f5f0e8] border-2 border-[#1a1a1a] px-2 py-0.5 uppercase">
                          {records.length} REGISTRO{records.length !== 1 ? 'S' : ''}
                        </span>
                      </div>

                      {records.length > 0 ? (
                        <div className="overflow-x-auto border-2 border-[#1a1a1a]">
                          {hasColumns ? (
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-[#1a1a1a] text-white">
                                  <th className="p-3 text-[10px] font-black uppercase tracking-wider w-10">#</th>
                                  {columns.map((col) => (
                                    <th
                                      key={col.field}
                                      className={`p-3 text-[10px] font-black uppercase tracking-wider ${col.width}`}
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
                                    className={`border-t border-[#1a1a1a]/10 ${idx % 2 === 0 ? 'bg-[#f5f0e8]' : 'bg-white'} hover:bg-[#0055ff]/5 transition-colors`}
                                  >
                                    <td className="p-3 text-xs font-bold opacity-30">{idx + 1}</td>
                                    {columns.map((col) => {
                                      const rawVal = record[col.field];
                                      const displayVal = formatValue(rawVal, col.field);
                                      const isBadge = col.field === 'priority' || col.field === 'status';
                                      const isCount =
                                        col.field === 'comments' ||
                                        col.field === 'subtasks' ||
                                        col.field === 'attachments';

                                      return (
                                        <td key={col.field} className="p-3 uppercase">
                                          {isBadge && typeof rawVal === 'string' && rawVal ? (
                                            <span
                                              className={`inline-block px-2 py-0.5 text-[10px] font-black uppercase tracking-wider border border-[#1a1a1a] ${col.field === 'priority' ? getPriorityBadge(rawVal) : getStatusBadge(rawVal)}`}
                                            >
                                              {rawVal.replace('_', ' ')}
                                            </span>
                                          ) : isCount && Array.isArray(rawVal) && rawVal.length > 0 ? (
                                            <span className="inline-block px-2 py-0.5 text-[10px] font-black tracking-wider border border-[#1a1a1a] bg-[#f5f0e8] uppercase">
                                              {col.field === 'subtasks' ? displayVal : `${rawVal.length}`}
                                            </span>
                                          ) : (
                                            <span
                                              className="text-xs font-medium uppercase truncate block max-w-[250px]"
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
                                  <th className="p-3 text-[10px] font-black uppercase tracking-wider w-10">#</th>
                                  {Object.keys(records[0])
                                    .slice(0, 6)
                                    .map((header) => (
                                      <th
                                        key={header}
                                        className="p-3 text-[10px] font-black uppercase tracking-wider min-w-[100px]"
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
                                    className={`border-t border-[#1a1a1a]/10 ${idx % 2 === 0 ? 'bg-[#f5f0e8]' : 'bg-white'}`}
                                  >
                                    <td className="p-3 text-xs font-bold opacity-30">{idx + 1}</td>
                                    {Object.values(record)
                                      .slice(0, 6)
                                      .map((val: any, i) => (
                                        <td
                                          key={i}
                                          className="p-3 text-xs font-medium uppercase truncate max-w-[200px]"
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
                          {records.length > 8 && (
                            <div className="p-3 text-center text-xs font-bold uppercase tracking-wider opacity-50 border-t-2 border-[#1a1a1a]/10 bg-[#f5f0e8]">
                              Mostrando 8 de {records.length} registros
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs font-bold uppercase opacity-50 p-6 text-center border-2 border-dashed border-[#1a1a1a]/20 bg-[#f5f0e8]/50">
                          Sin datos
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            <div className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] p-12 flex flex-col items-center justify-center text-center">
              <BarChart3 className="w-16 h-16 mb-4 opacity-20" />
              <h3 className="text-lg font-black uppercase mb-2">SIN VISTA PREVIA</h3>
              <p className="text-sm font-medium opacity-50 max-w-sm mb-4 uppercase">
                CONFIGURA LOS FILTROS Y HAZ CLIC EN "VISTA PREVIA" PARA VER LOS DATOS ANTES DE GENERAR EL REPORTE.
              </p>
              <button
                onClick={loadPreview}
                className="px-6 py-3 bg-[#0055ff] text-white border-2 border-[#1a1a1a] font-black uppercase text-sm hover:bg-[#1a1a1a] hover:text-white transition-all shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
              >
                Cargar Vista Previa
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
