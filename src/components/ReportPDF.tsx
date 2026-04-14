import React from 'react';
import { Document, Page, Text, View } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════════════════════
// BRAND COLORS — SGA PZBP BRUTALISTA DESIGN SYSTEM
// ═══════════════════════════════════════════════════════════════
const C = {
  black:  '#1a1a1a',
  blue:   '#0055ff',
  green:  '#00cc66',
  red:    '#e63b2e',
  orange: '#ff9900',
  purple: '#9b59b6',
  cream:  '#f5f0e8',
  white:  '#ffffff',
  grey:   '#6b7280',
};

// ═══════════════════════════════════════════════════════════════
// TEXT HELPERS — ALL UPPERCASE
// ═══════════════════════════════════════════════════════════════
const up = (s: string | undefined | null): string => (s || '—').toUpperCase();
const fmtDate = (s: string): string => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? s.toUpperCase() : d.toLocaleDateString('es-ES').toUpperCase();
  } catch { return s.toUpperCase(); }
};
const tr = (s: string | undefined | null, n: number): string => {
  const v = s || '—';
  return (v.length > n ? v.slice(0, n) + '…' : v).toUpperCase();
};

// ═══════════════════════════════════════════════════════════════
// REUSABLE PRIMITIVES
// ═══════════════════════════════════════════════════════════════

/** Brutalista offset shadow — matches shadow-[4px_4px_0px] */
const Shadow = ({ children, bg = C.white, style = {} }: { children: React.ReactNode; bg?: string; style?: any }) => (
  <View style={[{ position: 'relative' as const }, style]}>
    <View style={{ position: 'absolute' as const, top: 4, left: 4, width: '100%', height: '100%', backgroundColor: C.black, opacity: 0.3 }} />
    <View style={{ position: 'relative' as const, backgroundColor: bg, borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
      {children}
    </View>
  </View>
);

/** Progress bar — no border-radius, pure brutalista */
const Bar = ({ pct, color, h = 6, bg = '#e5e7eb' }: { pct: number; color: string; h?: number; bg?: string }) => (
  <View style={{ height: h, backgroundColor: bg, width: '100%' }}>
    <View style={{ height: h, backgroundColor: color, width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
  </View>
);

/** Stacked horizontal bar — multiple segments side by side */
const StackedBar = ({ segments, h = 14 }: { segments: { pct: number; color: string }[]; h?: number }) => (
  <View style={{ height: h, backgroundColor: '#e5e7eb', width: '100%', flexDirection: 'row' as const }}>
    {segments.map((seg, i) => (
      <View key={i} style={{ height: h, backgroundColor: seg.color, width: `${seg.pct}%` }} />
    ))}
  </View>
);

/** Watermark — fixed positioned, low opacity, diagonal text */
const Watermark = () => (
  <View
    style={{
      position: 'absolute' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
    }}
    fixed
  >
    <Text
      style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 72,
        color: C.black,
        opacity: 0.03,
        letterSpacing: 20,
        textTransform: 'uppercase' as const,
        transform: 'rotate(-35deg)',
      }}
    >
      SGA PZBP
    </Text>
  </View>
);

/** Verification pattern — decorative grid simulating doc authenticity mark */
const VerifPattern = () => {
  const pattern = [
    [1,1,1,0,1,1,1],
    [1,0,1,0,1,0,1],
    [1,1,1,0,0,1,0],
    [0,0,0,0,1,0,1],
    [1,0,1,0,1,1,1],
    [1,0,0,0,1,0,1],
    [1,1,1,0,1,1,1],
  ];
  return (
    <View style={{ flexDirection: 'column' as const }}>
      {pattern.map((row, ri) => (
        <View key={ri} style={{ flexDirection: 'row' as const }}>
          {row.map((cell, ci) => (
            <View
              key={ci}
              style={{
                width: 4, height: 4,
                backgroundColor: cell ? C.black : C.white,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
};

/** Fixed header bar — pages 2+ */
const FixedHdr = ({ section, date }: { section: string; date: string }) => (
  <View
    style={{
      position: 'absolute' as const, top: 0, left: 0, right: 0,
      height: 30, backgroundColor: C.black,
      flexDirection: 'row' as const, alignItems: 'center' as const,
      justifyContent: 'space-between' as const, paddingHorizontal: 24,
      borderBottomWidth: 4, borderBottomColor: C.blue,
      borderBottomStyle: 'solid' as const,
    }}
    fixed
  >
    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.white, letterSpacing: 2, textTransform: 'uppercase' as const }}>
      SGA PZBP
    </Text>
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.cream, letterSpacing: 1, textTransform: 'uppercase' as const, marginRight: 12 }}>
        {section}
      </Text>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.cream, opacity: 0.5, textTransform: 'uppercase' as const }}>
        {date}
      </Text>
    </View>
  </View>
);

/** Fixed footer bar */
const FixedFtr = () => (
  <View
    style={{
      position: 'absolute' as const, bottom: 0, left: 0, right: 0,
      height: 22, backgroundColor: C.cream,
      borderTopWidth: 2, borderTopColor: C.black, borderTopStyle: 'solid' as const,
      flexDirection: 'row' as const, alignItems: 'center' as const,
      justifyContent: 'space-between' as const, paddingHorizontal: 24,
    }}
    fixed
  >
    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.grey, letterSpacing: 1, textTransform: 'uppercase' as const }}>
      SGA PZBP — PREFECTURA NAVAL ARGENTINA
    </Text>
    <Text
      style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.grey, letterSpacing: 1, textTransform: 'uppercase' as const }}
      render={({ pageNumber, totalPages }) => `PÁGINA ${pageNumber} DE ${totalPages}`}
    />
  </View>
);

/** Section title with accent bar + badge count + border-b-4 */
const SecTitle = ({ title, count, color }: { title: string; count: number; color: string }) => (
  <View style={{ marginBottom: 10, marginTop: 4 }}>
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, paddingBottom: 6, borderBottomWidth: 4, borderBottomColor: C.black, borderBottomStyle: 'solid' as const }}>
      <View style={{ width: 4, height: 22, backgroundColor: color, marginRight: 8 }} />
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 2, flex: 1 }}>
        {title}
      </Text>
      <View style={{ backgroundColor: color, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, letterSpacing: 1, textTransform: 'uppercase' as const }}>
          {count} REGISTROS
        </Text>
      </View>
    </View>
  </View>
);

/** Table header row — black bg + accent underline */
const TH = ({ cols, color, w }: { cols: string[]; color: string; w: number[] }) => (
  <View>
    <View style={{ flexDirection: 'row' as const, backgroundColor: C.black, paddingVertical: 7, paddingHorizontal: 6 }}>
      {cols.map((c, i) => (
        <Text key={i} style={{ width: w[i], fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
          {c}
        </Text>
      ))}
    </View>
    <View style={{ height: 3, backgroundColor: color }} />
  </View>
);

/** Table data row — alternating cream/white */
const TR = ({ cells, w, alt }: { cells: React.ReactNode[]; w: number[]; alt: boolean }) => (
  <View style={{ flexDirection: 'row' as const, backgroundColor: alt ? C.cream : C.white, paddingVertical: 5, paddingHorizontal: 6, borderBottomWidth: 1, borderBottomColor: 'rgba(26,26,26,0.12)', borderBottomStyle: 'solid' as const }} wrap={false}>
    {cells.map((cell, i) => (
      <View key={i} style={{ width: w[i] }}>{cell}</View>
    ))}
  </View>
);

// Cell text styles
const ct: any = { fontFamily: 'Helvetica', fontSize: 7, color: C.black, textTransform: 'uppercase', letterSpacing: 0.3 };
const ctb: any = { ...ct, fontFamily: 'Helvetica-Bold' };

/** Status cell with colored indicator */
const StatusC = ({ status }: { status: string }) => {
  const m: Record<string, { l: string; c: string }> = {
    pendiente:  { l: 'PENDIENTE',  c: C.black },
    en_proceso: { l: 'EN PROCESO', c: C.blue },
    completado: { l: 'COMPLETADO', c: C.green },
  };
  const { l, c } = m[status] || { l: up(status), c: C.grey };
  return (
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
      {(status === 'completado' || status === 'en_proceso') && (
        <View style={{ width: 5, height: 5, backgroundColor: c, marginRight: 3, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }} />
      )}
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: c, textTransform: 'uppercase' as const, letterSpacing: 0.4, opacity: status === 'pendiente' ? 0.6 : 1 }}>
        {l}
      </Text>
    </View>
  );
};

/** Priority badge cell */
const PrioC = ({ p }: { p: string }) => {
  const m: Record<string, { c: string; bg: string }> = {
    alta:  { c: C.white, bg: C.red },
    media: { c: C.white, bg: C.orange },
    baja:  { c: C.white, bg: C.green },
  };
  const { c, bg } = m[p] || { c: C.black, bg: C.cream };
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start' as const, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5, color: c, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
        {up(p)}
      </Text>
    </View>
  );
};

/** Big KPI card for executive summary */
const KpiCard = ({ label, value, sub, color, wide }: { label: string; value: string | number; sub?: string; color: string; wide?: boolean }) => (
  <View style={{ width: wide ? '48%' : '31%', marginBottom: 8, marginHorizontal: wide ? '1%' : '1%' }}>
    <Shadow bg={C.white}>
      <View style={{ padding: 10 }}>
        <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 4 }}>
          <View style={{ width: 4, height: 14, backgroundColor: color, marginRight: 6 }} />
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.grey, textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>
            {label}
          </Text>
        </View>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.black, marginBottom: 2 }}>
          {value}
        </Text>
        {sub && (
          <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.grey, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
            {sub}
          </Text>
        )}
      </View>
    </Shadow>
  </View>
);

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
interface Props {
  data: {
    visitas: any[];
    tareas: any[];
    novedades: any[];
    diligenciamientos: any[];
    personal: any[];
  };
  now: string;
  dateStr: string;
}

export default function ReportPDF({ data, now, dateStr }: Props) {
  const vis = data.visitas || [];
  const tar = data.tareas || [];
  const per = data.personal || [];
  const nov = data.novedades || [];
  const dil = data.diligenciamientos || [];

  const nV = vis.length;
  const nT = tar.length;
  const nP = per.length;
  const nN = nov.length;
  const nD = dil.length;
  const total = nV + nT + nP + nN + nD;

  // Task analytics
  const tComp = tar.filter((t: any) => t.status === 'completado').length;
  const tProc = tar.filter((t: any) => t.status === 'en_proceso').length;
  const tPend = tar.filter((t: any) => t.status === 'pendiente').length;
  const pctComp = nT > 0 ? Math.round((tComp / nT) * 100) : 0;
  const pctProc = nT > 0 ? Math.round((tProc / nT) * 100) : 0;
  const pctPend = nT > 0 ? Math.round((tPend / nT) * 100) : 0;

  // Overdue tasks
  const today = new Date();
  const tOverdue = tar.filter((t: any) => {
    if (!t.dueDate || t.status === 'completado') return false;
    return new Date(t.dueDate) < today;
  }).length;

  // Priority analytics
  const pA = tar.filter((t: any) => t.priority === 'alta' && t.status !== 'completado').length;
  const pM = tar.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length;
  const pB = tar.filter((t: any) => t.priority === 'baja' && t.status !== 'completado').length;
  const pTot = pA + pM + pB;

  // Recurrence stats
  const tRecur = tar.filter((t: any) => t.recurrence && t.recurrence !== 'none').length;

  // Subtask stats
  const totalSubs = tar.reduce((acc: number, t: any) => acc + (t.subtasks?.length || 0), 0);
  const completedSubs = tar.reduce((acc: number, t: any) => acc + (t.subtasks?.filter((s: any) => s.completed).length || 0), 0);

  // Personal stats
  const perActive = per.filter((p: any) => p.status === 'Activo').length;

  const compColor = pctComp > 70 ? C.green : pctComp > 40 ? C.orange : C.red;
  const dateUp = dateStr.toUpperCase();

  // Recent activity
  const acts: { date: string; type: string; detail: string; color: string }[] = [];
  vis.slice(0, 2).forEach((v: any) => acts.push({ date: v.fecha || 'N/A', type: 'VISITA', detail: `${v.origen || '—'} → ${v.destino || '—'}`, color: C.blue }));
  tar.slice(0, 2).forEach((t: any) => acts.push({ date: t.createdAt ? fmtDate(t.createdAt) : 'N/A', type: 'TAREA', detail: t.title || '—', color: C.green }));
  nov.slice(0, 1).forEach((n: any) => acts.push({ date: n.createdAt ? fmtDate(n.createdAt) : 'N/A', type: 'NOVEDAD', detail: n.title || '—', color: C.black }));

  // Cover KPIs
  const coverKpis = [
    { label: 'VISITAS', value: nV, color: C.blue },
    { label: 'TAREAS', value: nT, color: C.green },
    { label: 'PERSONAL', value: nP, color: C.orange },
    { label: 'NOVEDADES', value: nN, color: C.black },
    { label: 'DILIGENCIAS', value: nD, color: C.purple },
  ];

  // TOC entries
  const tocEntries = [
    { n: '01', title: 'PORTADA', page: '1', color: C.black },
    { n: '02', title: 'TABLA DE CONTENIDOS', page: '2', color: C.black },
    { n: '03', title: 'RESUMEN EJECUTIVO', page: '3', color: C.blue },
    { n: '04', title: 'INDICADORES CLAVE', page: '4', color: C.blue },
    { n: '05', title: 'VISITAS TÉCNICAS', page: '5', color: C.blue },
    { n: '06', title: 'TAREAS OPERATIVAS', page: '6', color: C.green },
    { n: '07', title: 'NOVEDADES', page: '7', color: C.black },
    { n: '08', title: 'DILIGENCIAMIENTOS', page: '8', color: C.purple },
    { n: '09', title: 'PERSONAL ACTIVO', page: '9', color: C.orange },
  ];

  // Table configs — enhanced
  const vCols = ['#', 'ORIGEN', 'DESTINO', 'FECHA', 'HORA', 'RESPONSABLE', 'OBSERVACIONES'];
  const vW = [16, 75, 75, 50, 35, 75, 142];
  const tCols = ['#', 'TÍTULO', 'ESTADO', 'PRIORIDAD', 'VENC.', 'SUBTAREAS', 'RECUR.'];
  const tW = [16, 155, 68, 58, 55, 52, 60];
  const nCols = ['#', 'TÍTULO', 'CONTENIDO', 'FECHA', 'AUTOR'];
  const nW = [16, 130, 175, 70, 75];
  const dCols = ['#', 'TÍTULO', 'DETALLE', 'FECHA', 'AUTOR'];
  const dW = [16, 130, 175, 70, 75];
  const pCols = ['#', 'NOMBRE', 'ROL', 'ESTADO'];
  const pW = [16, 200, 155, 96];

  const MAX = 40;

  // Helper for recurrence display
  const recLabel = (r: string | undefined): string => {
    const m: Record<string, string> = { diaria: 'DIARIA', semanal: 'SEMANAL', mensual: 'MENSUAL', none: '—' };
    return m[r || 'none'] || '—';
  };

  // Subtask display
  const subLabel = (subs: any[] | undefined): string => {
    if (!subs || subs.length === 0) return '—';
    const done = subs.filter((s: any) => s.completed).length;
    return `${done}/${subs.length}`;
  };

  return (
    <Document>
      {/* ════════════════════════════════════════════════════════════
          PÁGINA 1: PORTADA
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0 }}>
        {/* ZONA SUPERIOR — CREMA 40% */}
        <View style={{ height: '40%', backgroundColor: C.cream, position: 'relative' as const }}>
          <View style={{ height: 8, backgroundColor: C.blue, width: '100%' }} />
          <View style={{ paddingHorizontal: 40, paddingTop: 28 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 5, marginBottom: 14, opacity: 0.7 }}>
              PREFECTURA NAVAL ARGENTINA
            </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 60, color: C.black, lineHeight: 1, marginBottom: 2 }}>
              SGA
            </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 60, color: C.blue, lineHeight: 1, marginBottom: 14 }}>
              PZBP
            </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 3 }}>
              SISTEMA DE GESTIÓN DE ACTIVIDADES
            </Text>
          </View>

          {/* Verification pattern — bottom right corner */}
          <View style={{ position: 'absolute' as const, bottom: 14, right: 40 }}>
            <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 5, color: C.grey, marginRight: 6, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                DOC ID
              </Text>
              <VerifPattern />
            </View>
          </View>
        </View>

        {/* ZONA INFERIOR — NEGRO 60% */}
        <View style={{ height: '60%', backgroundColor: C.black, paddingHorizontal: 40, paddingTop: 22 }}>
          {/* Badge */}
          <View style={{ alignItems: 'center' as const, marginBottom: 16 }}>
            <View style={{ borderWidth: 2, borderColor: C.white, borderStyle: 'solid' as const, paddingHorizontal: 24, paddingVertical: 6 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.white, textTransform: 'uppercase' as const, letterSpacing: 4 }}>
                REPORTE COMPLETO
              </Text>
            </View>
          </View>

          {/* KPI Grid 2 cols */}
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const }}>
            {coverKpis.map((k, idx) => (
              <View key={idx} style={{ width: '46%', marginHorizontal: '2%', marginBottom: 8 }}>
                <View style={{ backgroundColor: C.cream, borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const, paddingVertical: 8, paddingHorizontal: 10, flexDirection: 'row' as const, alignItems: 'center' as const }}>
                  <View style={{ width: 4, height: 28, backgroundColor: k.color, marginRight: 10 }} />
                  <View>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 24, color: C.black }}>{k.value}</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 2, opacity: 0.6 }}>{k.label}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Separator */}
          <View style={{ height: 2, backgroundColor: C.white, opacity: 0.2, marginVertical: 10, marginHorizontal: 20 }} />

          {/* Total */}
          <View style={{ alignItems: 'center' as const }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.white, textTransform: 'uppercase' as const, letterSpacing: 3, marginBottom: 3, opacity: 0.7 }}>
              TOTAL DE REGISTROS
            </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 32, color: C.white }}>{total}</Text>
          </View>

          {/* Date + period info */}
          <View style={{ alignItems: 'center' as const, marginTop: 8 }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.cream, opacity: 0.5, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
              GENERADO EL {now.toUpperCase()}
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.cream, opacity: 0.35, textTransform: 'uppercase' as const, letterSpacing: 1, marginTop: 3 }}>
              {dateUp}
            </Text>
          </View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 2: TABLA DE CONTENIDOS
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHdr section="ÍNDICE" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 40, paddingBottom: 34 }}>
          <View style={{ marginBottom: 20, paddingBottom: 8, borderBottomWidth: 4, borderBottomColor: C.black, borderBottomStyle: 'solid' as const }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 3 }}>
              TABLA DE CONTENIDOS
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.grey, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginTop: 4 }}>
              ESTRUCTURA DEL REPORTE — {total} REGISTROS TOTALES
            </Text>
          </View>

          {/* TOC entries */}
          {tocEntries.map((entry, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row' as const, alignItems: 'center' as const,
                paddingVertical: 10, paddingHorizontal: 12,
                backgroundColor: i % 2 === 0 ? C.cream : C.white,
                borderBottomWidth: 2, borderBottomColor: 'rgba(26,26,26,0.08)',
                borderBottomStyle: 'solid' as const,
                borderLeftWidth: 4, borderLeftColor: entry.color,
                borderLeftStyle: 'solid' as const,
              }}
            >
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, color: entry.color, width: 30, opacity: 0.4 }}>
                {entry.n}
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 2, flex: 1 }}>
                {entry.title}
              </Text>
              <View style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(26,26,26,0.15)', borderBottomStyle: 'solid' as const, flex: 1, marginHorizontal: 8, height: 1 }} />
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.grey, letterSpacing: 1 }}>
                {entry.page}
              </Text>
            </View>
          ))}

          {/* Legend box */}
          <View style={{ marginTop: 24 }}>
            <Shadow bg={C.cream}>
              <View style={{ padding: 12, flexDirection: 'row' as const, justifyContent: 'space-between' as const }}>
                <View>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 4 }}>
                    DOCUMENTO GENERADO POR
                  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.blue, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                    SISTEMA DE GESTIÓN DE ACTIVIDADES
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' as const }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 4 }}>
                    CLASIFICACIÓN
                  </Text>
                  <View style={{ backgroundColor: C.black, paddingHorizontal: 8, paddingVertical: 3 }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, letterSpacing: 2 }}>
                      USO INTERNO
                    </Text>
                  </View>
                </View>
              </View>
            </Shadow>
          </View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 3: RESUMEN EJECUTIVO
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHdr section="RESUMEN EJECUTIVO" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          {/* Title */}
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 14, paddingBottom: 6, borderBottomWidth: 4, borderBottomColor: C.black, borderBottomStyle: 'solid' as const }}>
            <View style={{ width: 4, height: 20, backgroundColor: C.blue, marginRight: 8 }} />
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 2 }}>
              RESUMEN EJECUTIVO
            </Text>
          </View>

          {/* KPI Grid — 3 columns */}
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginBottom: 12 }}>
            <KpiCard label="TOTAL REGISTROS" value={total} sub="EN TODAS LAS FUENTES" color={C.blue} />
            <KpiCard label="TASA COMPLETITUD" value={`${pctComp}%`} sub={`${tComp} DE ${nT} TAREAS`} color={compColor} />
            <KpiCard label="TAREAS VENCIDAS" value={tOverdue} sub={tOverdue > 0 ? 'REQUIEREN ATENCIÓN' : 'SIN VENCIMIENTOS'} color={tOverdue > 0 ? C.red : C.green} />
          </View>
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginBottom: 12 }}>
            <KpiCard label="VISITAS TÉCNICAS" value={nV} sub="REGISTROS DE CAMPO" color={C.blue} />
            <KpiCard label="PERSONAL ACTIVO" value={`${perActive}/${nP}`} sub={`${nP > 0 ? Math.round((perActive / nP) * 100) : 0}% OPERATIVO`} color={C.orange} />
            <KpiCard label="TAREAS RECURRENTES" value={tRecur} sub={`DE ${nT} TOTALES`} color={C.purple} />
          </View>
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginBottom: 14 }}>
            <KpiCard label="NOVEDADES" value={nN} sub="COMUNICACIONES" color={C.black} />
            <KpiCard label="DILIGENCIAMIENTOS" value={nD} sub="TRÁMITES REGISTRADOS" color={C.purple} />
            <KpiCard label="SUBTAREAS" value={`${completedSubs}/${totalSubs}`} sub={totalSubs > 0 ? `${Math.round((completedSubs / totalSubs) * 100)}% COMPLETADAS` : 'SIN SUBTAREAS'} color={C.green} />
          </View>

          {/* Distribution section */}
          <View style={{ marginBottom: 12 }}>
            <Shadow bg={C.white}>
              <View style={{ padding: 12 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 10, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const, paddingBottom: 4 }}>
                  DISTRIBUCIÓN POR ESTADO DE TAREAS
                </Text>

                {/* Stacked bar */}
                <StackedBar
                  segments={[
                    { pct: pctComp, color: C.green },
                    { pct: pctProc, color: C.blue },
                    { pct: pctPend, color: '#d1d5db' },
                  ]}
                  h={18}
                />

                {/* Legend */}
                <View style={{ flexDirection: 'row' as const, marginTop: 8, justifyContent: 'space-between' as const }}>
                  {[
                    { label: 'COMPLETADAS', val: tComp, pct: pctComp, color: C.green },
                    { label: 'EN PROCESO', val: tProc, pct: pctProc, color: C.blue },
                    { label: 'PENDIENTES', val: tPend, pct: pctPend, color: '#d1d5db' },
                  ].map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                      <View style={{ width: 10, height: 10, backgroundColor: item.color, marginRight: 4, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }} />
                      <View>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
                          {item.label}
                        </Text>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.black }}>
                          {item.val} ({item.pct}%)
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            </Shadow>
          </View>

          {/* Distribution by modules — horizontal bars */}
          <Shadow bg={C.white}>
            <View style={{ padding: 12 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1.5, marginBottom: 10, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const, paddingBottom: 4 }}>
                DISTRIBUCIÓN POR MÓDULO
              </Text>
              {[
                { label: 'VISITAS', val: nV, color: C.blue },
                { label: 'TAREAS', val: nT, color: C.green },
                { label: 'PERSONAL', val: nP, color: C.orange },
                { label: 'NOVEDADES', val: nN, color: C.black },
                { label: 'DILIGENCIAMIENTOS', val: nD, color: C.purple },
              ].map((mod, i) => (
                <View key={i} style={{ marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 2 }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 0.8 }}>
                      {mod.label}
                    </Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: mod.color }}>
                      {mod.val}
                    </Text>
                  </View>
                  <Bar pct={total > 0 ? (mod.val / total) * 100 : 0} color={mod.color} h={8} />
                </View>
              ))}
            </View>
          </Shadow>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 4: INDICADORES CLAVE
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHdr section="INDICADORES CLAVE" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 14, paddingBottom: 6, borderBottomWidth: 4, borderBottomColor: C.black, borderBottomStyle: 'solid' as const }}>
            <View style={{ width: 4, height: 20, backgroundColor: C.blue, marginRight: 8 }} />
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 16, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 2 }}>
              INDICADORES CLAVE
            </Text>
          </View>

          {/* 4 indicator cards */}
          <View style={{ flexDirection: 'row' as const, marginBottom: 14 }}>
            {/* CARD 1: Estado de Tareas */}
            <View style={{ width: '25%', paddingRight: 4 }}>
              <Shadow bg={C.white}>
                <View style={{ padding: 8 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const, paddingBottom: 3 }}>
                    ESTADO DE TAREAS
                  </Text>
                  {[
                    { l: 'COMPLETADAS', v: tComp, c: C.green },
                    { l: 'EN PROCESO', v: tProc, c: C.blue },
                    { l: 'PENDIENTES', v: tPend, c: '#d1d5db' },
                  ].map((item, i) => (
                    <View key={i} style={{ marginBottom: i < 2 ? 6 : 0 }}>
                      <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 2 }}>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>{item.l}</Text>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: item.c === '#d1d5db' ? C.black : item.c }}>{item.v}</Text>
                      </View>
                      <Bar pct={nT > 0 ? (item.v / nT) * 100 : 0} color={item.c} />
                    </View>
                  ))}
                </View>
              </Shadow>
            </View>

            {/* CARD 2: Completitud */}
            <View style={{ width: '25%', paddingHorizontal: 2 }}>
              <Shadow bg={C.white}>
                <View style={{ padding: 8, alignItems: 'center' as const }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4, alignSelf: 'flex-start' as const, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const, paddingBottom: 3, width: '100%' }}>
                    COMPLETITUD
                  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 40, color: compColor, textAlign: 'center' as const, marginVertical: 2 }}>
                    {pctComp}<Text style={{ fontSize: 18 }}>%</Text>
                  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5, color: C.grey, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 4 }}>
                    TAREAS COMPLETADAS
                  </Text>
                  <Bar pct={pctComp} color={compColor} h={10} />
                </View>
              </Shadow>
            </View>

            {/* CARD 3: Prioridad */}
            <View style={{ width: '25%', paddingHorizontal: 2 }}>
              <Shadow bg={C.white}>
                <View style={{ padding: 8 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 8, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const, paddingBottom: 3 }}>
                    PRIORIDAD ACTIVA
                  </Text>
                  {[
                    { l: 'ALTA', v: pA, c: C.red },
                    { l: 'MEDIA', v: pM, c: C.orange },
                    { l: 'BAJA', v: pB, c: C.green },
                  ].map((item, i) => (
                    <View key={i} style={{ marginBottom: i < 2 ? 6 : 0 }}>
                      <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 2 }}>
                        <View style={{ backgroundColor: item.c, paddingHorizontal: 4, paddingVertical: 1, marginRight: 4, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }}>
                          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5, color: C.white }}>{item.l}</Text>
                        </View>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: item.c }}>{item.v}</Text>
                      </View>
                      <Bar pct={pTot > 0 ? (item.v / pTot) * 100 : 0} color={item.c} />
                    </View>
                  ))}
                </View>
              </Shadow>
            </View>

            {/* CARD 4: Tareas Vencidas (NEW) */}
            <View style={{ width: '25%', paddingLeft: 4 }}>
              <Shadow bg={C.white}>
                <View style={{ padding: 8, alignItems: 'center' as const }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 1, marginBottom: 4, alignSelf: 'flex-start' as const, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const, paddingBottom: 3, width: '100%' }}>
                    VENCIDAS
                  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 40, color: tOverdue > 0 ? C.red : C.green, textAlign: 'center' as const, marginVertical: 2 }}>
                    {tOverdue}
                  </Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5, color: C.grey, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 4 }}>
                    {tOverdue > 0 ? 'ACCIÓN REQUERIDA' : 'SIN VENCIMIENTOS'}
                  </Text>
                  {tOverdue > 0 && (
                    <View style={{ backgroundColor: C.red, paddingHorizontal: 8, paddingVertical: 3, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }}>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white, letterSpacing: 1 }}>
                        ▲ ALERTA
                      </Text>
                    </View>
                  )}
                </View>
              </Shadow>
            </View>
          </View>

          {/* Actividad Reciente */}
          <View>
            <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 2, borderBottomColor: C.black, borderBottomStyle: 'solid' as const }}>
              <View style={{ width: 4, height: 14, backgroundColor: C.black, marginRight: 8 }} />
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.black, textTransform: 'uppercase' as const, letterSpacing: 2 }}>
                ACTIVIDAD RECIENTE
              </Text>
            </View>
            <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
              {acts.slice(0, 5).map((a, i) => (
                <View key={i} style={{ flexDirection: 'row' as const, alignItems: 'center' as const, paddingVertical: 6, paddingHorizontal: 8, backgroundColor: i % 2 === 0 ? C.cream : C.white, borderBottomWidth: i < acts.length - 1 ? 1 : 0, borderBottomColor: 'rgba(26,26,26,0.1)', borderBottomStyle: 'solid' as const }}>
                  <View style={{ width: 6, height: 6, backgroundColor: a.color, marginRight: 6, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }} />
                  <View style={{ backgroundColor: a.color, paddingHorizontal: 5, paddingVertical: 2, marginRight: 8, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5, color: C.white, letterSpacing: 0.5 }}>{a.type}</Text>
                  </View>
                  <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.black, flex: 1, textTransform: 'uppercase' as const, letterSpacing: 0.3 }}>{tr(a.detail, 50)}</Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.grey, textTransform: 'uppercase' as const }}>{a.date.toUpperCase()}</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 5: VISITAS TÉCNICAS (+ OBSERVACIONES)
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }} wrap>
        <FixedHdr section="VISITAS TÉCNICAS" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SecTitle title="VISITAS TÉCNICAS" count={nV} color={C.blue} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <TH cols={vCols} color={C.blue} w={vW} />
            {vis.slice(0, MAX).map((v: any, i: number) => (
              <TR key={i} alt={i % 2 === 0} w={vW} cells={[
                <Text style={ct}>{i + 1}</Text>,
                <Text style={ct}>{tr(v.origen, 16)}</Text>,
                <Text style={ct}>{tr(v.destino, 16)}</Text>,
                <Text style={ct}>{up(v.fecha)}</Text>,
                <Text style={ct}>{up(v.hora)}</Text>,
                <Text style={ct}>{tr(v.responsable, 16)}</Text>,
                <Text style={{ ...ct, fontSize: 6, opacity: 0.7 }}>{tr(v.observaciones, 30)}</Text>,
              ]} />
            ))}
          </View>
          {nV > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {nV} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 6: TAREAS (+ SUBTAREAS, RECURRENCIA)
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }} wrap>
        <FixedHdr section="TAREAS OPERATIVAS" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SecTitle title="TAREAS OPERATIVAS" count={nT} color={C.green} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <TH cols={tCols} color={C.green} w={tW} />
            {tar.slice(0, MAX).map((t: any, i: number) => (
              <TR key={i} alt={i % 2 === 0} w={tW} cells={[
                <Text style={ct}>{i + 1}</Text>,
                <View>
                  <Text style={ct}>{tr(t.title, 32)}</Text>
                  {t.tags && t.tags.length > 0 && (
                    <View style={{ flexDirection: 'row' as const, marginTop: 2 }}>
                      {t.tags.slice(0, 3).map((tag: string, ti: number) => (
                        <View key={ti} style={{ backgroundColor: C.blue, paddingHorizontal: 3, paddingVertical: 1, marginRight: 2 }}>
                          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 4, color: C.white, letterSpacing: 0.3 }}>{tag.toUpperCase()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>,
                <StatusC status={t.status} />,
                <PrioC p={t.priority} />,
                <Text style={ct}>{up(t.dueDate)}</Text>,
                <Text style={ctb}>{subLabel(t.subtasks)}</Text>,
                <Text style={{ ...ct, fontSize: 6 }}>{recLabel(t.recurrence)}</Text>,
              ]} />
            ))}
          </View>
          {nT > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {nT} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 7: NOVEDADES (+ CONTENIDO PREVIEW)
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }} wrap>
        <FixedHdr section="NOVEDADES" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SecTitle title="NOVEDADES" count={nN} color={C.black} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <TH cols={nCols} color={C.black} w={nW} />
            {nov.slice(0, MAX).map((n: any, i: number) => (
              <TR key={i} alt={i % 2 === 0} w={nW} cells={[
                <Text style={ct}>{i + 1}</Text>,
                <Text style={ct}>{tr(n.title, 26)}</Text>,
                <Text style={{ ...ct, fontSize: 6, opacity: 0.7 }}>{tr(n.content, 36)}</Text>,
                <Text style={ct}>{up(n.fecha || fmtDate(n.created_at || n.createdAt))}</Text>,
                <Text style={ct}>{tr(n.author_name || n.authorName, 16)}</Text>,
              ]} />
            ))}
          </View>
          {nN > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {nN} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 8: DILIGENCIAMIENTOS (+ DETALLE PREVIEW)
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }} wrap>
        <FixedHdr section="DILIGENCIAMIENTOS" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SecTitle title="DILIGENCIAMIENTOS" count={nD} color={C.purple} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <TH cols={dCols} color={C.purple} w={dW} />
            {dil.slice(0, MAX).map((d: any, i: number) => (
              <TR key={i} alt={i % 2 === 0} w={dW} cells={[
                <Text style={ct}>{i + 1}</Text>,
                <Text style={ct}>{tr(d.title, 26)}</Text>,
                <Text style={{ ...ct, fontSize: 6, opacity: 0.7 }}>{tr(d.content, 36)}</Text>,
                <Text style={ct}>{up(d.fecha || fmtDate(d.created_at || d.createdAt))}</Text>,
                <Text style={ct}>{tr(d.author_name || d.authorName, 16)}</Text>,
              ]} />
            ))}
          </View>
          {nD > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {nD} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════════════════════
          PÁGINA 9: PERSONAL ACTIVO
          ════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }} wrap>
        <FixedHdr section="PERSONAL ACTIVO" date={dateUp} />
        <FixedFtr />
        <Watermark />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SecTitle title="PERSONAL ACTIVO" count={nP} color={C.orange} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <TH cols={pCols} color={C.orange} w={pW} />
            {per.slice(0, MAX).map((p: any, i: number) => (
              <TR key={i} alt={i % 2 === 0} w={pW} cells={[
                <Text style={ct}>{i + 1}</Text>,
                <Text style={ct}>{tr(p.name, 38)}</Text>,
                <Text style={ct}>{tr(p.role, 28)}</Text>,
                <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                  <View style={{ width: 5, height: 5, backgroundColor: p.status === 'Activo' ? C.green : C.red, marginRight: 3, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const }} />
                  <Text style={{ ...ctb, color: p.status === 'Activo' ? C.green : C.red }}>{up(p.status)}</Text>
                </View>,
              ]} />
            ))}
          </View>
          {nP > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {nP} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
