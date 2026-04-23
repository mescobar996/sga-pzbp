import React from 'react';
import { Document, Page, Text, View, Image } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════════════════════
// DESIGN SYSTEM — SGA PZBP — PREFECTURA NAVAL ARGENTINA
// ═══════════════════════════════════════════════════════════════
const C = {
  pageBg:    '#F5F4EF',  // crema institucional
  cardBg:    '#FFFFFF',
  navy:      '#0A1628',  // azul marino PNA — header/franja oscura
  blue:      '#1B4FD8',  // azul institucional acento
  green:     '#10B981',  // completado
  amber:     '#F59E0B',  // en proceso / warning
  red:       '#EF4444',  // vencido / error
  gray:      '#6B7280',  // pendiente / neutro
  textMain:  '#111827',
  textSec:   '#6B7280',
  border:    '#E5E7EB',
  rowAlt:    '#F9FAFB',
  white:     '#FFFFFF',
  purple:    '#7C3AED',
};

// ─── TEXT HELPERS ─────────────────────────────────────────────
const up = (s: string | undefined | null): string => (s || '—').toUpperCase();
const fmtDate = (s: string | undefined | null): string => {
  if (!s) return '—';
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s.toUpperCase();
    return d.toISOString().split('T')[0].toUpperCase();
  } catch { return String(s).toUpperCase(); }
};
const tr = (s: string | undefined | null, n: number): string => {
  const v = (s || '—').toUpperCase();
  return v.length > n ? v.slice(0, n) + '…' : v;
};
// Random 4-digit number — stable per render pass
let _docRand = 0;
const getDocNum = () => {
  if (!_docRand) _docRand = Math.floor(1000 + Math.random() * 9000);
  return _docRand;
};

// ─── BASE STYLES ──────────────────────────────────────────────
const baseText: any = {
  fontFamily: 'Helvetica',
  fontSize: 10,
  color: C.textMain,
};
const boldText: any = { ...baseText, fontFamily: 'Helvetica-Bold' };
const cellText: any = { fontFamily: 'Helvetica', fontSize: 8, color: C.textMain };
const cellBold: any = { ...cellText, fontFamily: 'Helvetica-Bold' };

// ─── WATERMARK ────────────────────────────────────────────────
const Watermark = () => (
  <View
    style={{
      position: 'absolute' as const,
      top: 0, left: 0, right: 0, bottom: 0,
      justifyContent: 'center' as const,
      alignItems: 'center' as const,
      zIndex: 0,
    }}
  >
    <Text
      style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 72,
        color: '#EEEEEE',
        transform: 'rotate(-45deg)',
        letterSpacing: 16,
      }}
    >
      SGA PZBP
    </Text>
  </View>
);

// ─── PAGE HEADER (pages 2-9) ──────────────────────────────────
const PageHeader = ({ section, date, docNum }: { section: string; date: string; docNum: string }) => (
  <View
    style={{
      position: 'absolute' as const, top: 0, left: 0, right: 0,
      height: 32, backgroundColor: C.navy,
      flexDirection: 'row' as const, alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
    }}
    fixed
  >
    {/* Left */}
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, gap: 8 }}>
      <View style={{ flexDirection: 'column' as const }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.white, letterSpacing: 1.5 }}>
          SGA PZBP
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: '#93C5FD', letterSpacing: 0.5 }}>
          {docNum}
        </Text>
      </View>
    </View>
    {/* Center */}
    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, letterSpacing: 3, textTransform: 'uppercase' as const }}>
      {section}
    </Text>
    {/* Right */}
    <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.white, letterSpacing: 0.5 }}>
      {date}
    </Text>
  </View>
);

// ─── PAGE FOOTER (pages 2-9) ──────────────────────────────────
const PageFooter = () => (
  <View
    style={{
      position: 'absolute' as const, bottom: 0, left: 0, right: 0,
      height: 24, backgroundColor: C.white,
      borderTopWidth: 1, borderTopColor: C.border, borderTopStyle: 'solid' as const,
      flexDirection: 'row' as const, alignItems: 'center' as const,
      justifyContent: 'space-between' as const, paddingHorizontal: 20,
    }}
    fixed
  >
    <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.textSec, letterSpacing: 0.5 }}>
      SGA PZBP — PREFECTURA NAVAL ARGENTINA
    </Text>
    <Text
      style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.textSec }}
      render={({ pageNumber, totalPages }) => `PÁGINA ${pageNumber} DE ${totalPages}`}
    />
  </View>
);

// ─── PNA VERIFIED STAMP ───────────────────────────────────────
const VerifiedStamp = ({ id }: { id: string }) => (
  <View style={{ position: 'absolute' as const, bottom: 50, right: 30, transform: 'rotate(-8deg)' }}>
    <View style={{
      borderWidth: 2, borderColor: C.blue, borderStyle: 'solid' as const,
      padding: 8, width: 130, alignItems: 'center' as const,
    }}>
      <View style={{ borderWidth: 1, borderColor: C.blue, borderStyle: 'solid' as const, width: '100%', alignItems: 'center' as const, paddingVertical: 6 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.blue, letterSpacing: 2.5, textTransform: 'uppercase' as const }}>
          PNA VERIFIED
        </Text>
        <View style={{ height: 1, width: '80%', backgroundColor: C.blue, marginVertical: 4 }} />
        <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.blue, letterSpacing: 0.8 }}>
          SGA PZBP · SECURE DOC
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.blue, marginTop: 3, letterSpacing: 0.5 }}>
          ID: {id}
        </Text>
      </View>
    </View>
  </View>
);

// ─── QR DECORATIVE MARK ───────────────────────────────────────
const QRMark = ({ size = 50 }: { size?: number }) => {
  const cell = size / 7;
  const pattern = [
    [1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1],
    [1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1],
    [1,0,1,0,1,0,1],
    [1,0,0,0,0,0,1],
    [1,1,1,1,1,1,1],
  ];
  return (
    <View style={{ width: size, height: size, borderWidth: 2, borderColor: C.blue, borderStyle: 'solid' as const, padding: 1 }}>
      {pattern.map((row, r) => (
        <View key={r} style={{ flexDirection: 'row' as const }}>
          {row.map((val, c) => (
            <View key={c} style={{ width: cell, height: cell, backgroundColor: val ? C.blue : C.white }} />
          ))}
        </View>
      ))}
    </View>
  );
};

// ─── TABLE HEADER ─────────────────────────────────────────────
const TableHeader = ({ cols, widths }: { cols: string[]; widths: number[] }) => (
  <View>
    <View style={{
      flexDirection: 'row' as const, backgroundColor: C.navy,
      paddingVertical: 6, paddingHorizontal: 8,
    }}>
      {cols.map((col, i) => (
        <Text key={i} style={{
          width: widths[i],
          fontFamily: 'Helvetica-Bold', fontSize: 7,
          color: C.white, textTransform: 'uppercase' as const, letterSpacing: 0.8,
        }}>
          {col}
        </Text>
      ))}
    </View>
  </View>
);

// ─── TABLE ROW ────────────────────────────────────────────────
const TableRow = ({
  cells, widths, isAlt, accentColor, highlight
}: {
  cells: React.ReactNode[];
  widths: number[];
  isAlt: boolean;
  accentColor?: string;
  highlight?: boolean;
}) => (
  <View
    style={{
      flexDirection: 'row' as const,
      backgroundColor: isAlt ? C.rowAlt : C.white,
      paddingVertical: 5, paddingHorizontal: 8,
      borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' as const,
      borderLeftWidth: accentColor ? 3 : 0,
      borderLeftColor: accentColor || 'transparent',
      borderLeftStyle: 'solid' as const,
      ...(highlight ? { borderLeftWidth: 3, borderLeftColor: C.blue } : {}),
    }}
    wrap={false}
  >
    {cells.map((cell, i) => (
      <View key={i} style={{ width: widths[i] }}>{cell}</View>
    ))}
  </View>
);

// ─── STATUS BADGE ─────────────────────────────────────────────
const StatusBadge = ({ status }: { status: string }) => {
  const map: Record<string, { label: string; bg: string }> = {
    completado: { label: 'COMPLETADO', bg: C.green },
    en_proceso: { label: 'EN PROCESO', bg: C.amber },
    pendiente:  { label: 'PENDIENTE',  bg: C.gray },
  };
  const { label, bg } = map[status?.toLowerCase()] || { label: up(status), bg: C.gray };
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, alignSelf: 'flex-start' as const }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.white, letterSpacing: 0.5 }}>
        {label}
      </Text>
    </View>
  );
};

// ─── PRIORITY BADGE ───────────────────────────────────────────
const PriorityBadge = ({ priority }: { priority: string }) => {
  const map: Record<string, { bg: string; fg: string }> = {
    alta:  { bg: C.red,    fg: C.white },
    media: { bg: C.amber,  fg: C.white },
    baja:  { bg: C.border, fg: '#374151' },
  };
  const { bg, fg } = map[priority?.toLowerCase()] || { bg: C.border, fg: '#374151' };
  return (
    <View style={{ backgroundColor: bg, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, alignSelf: 'flex-start' as const }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: fg, letterSpacing: 0.5 }}>
        {up(priority)}
      </Text>
    </View>
  );
};

// ─── ROLE BADGE ───────────────────────────────────────────────
const RoleBadge = ({ role }: { role: string }) => {
  const isSupervisor = role?.toUpperCase().includes('SUPERVISOR');
  return (
    <View style={{
      backgroundColor: isSupervisor ? C.blue : C.border,
      paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, alignSelf: 'flex-start' as const,
    }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: isSupervisor ? C.white : '#374151', letterSpacing: 0.5 }}>
        {up(role)}
      </Text>
    </View>
  );
};

// ─── ACTIVE BADGE ─────────────────────────────────────────────
const ActiveBadge = ({ status }: { status: string }) => (
  <View style={{ backgroundColor: C.green, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, alignSelf: 'flex-start' as const }}>
    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.white, letterSpacing: 0.5 }}>
      {up(status)}
    </Text>
  </View>
);

// ─── KPI CARD (executive summary) ────────────────────────────
const KpiCard = ({
  label, value, sub, accentColor
}: { label: string; value: string | number; sub: string; accentColor: string }) => (
  <View style={{
    width: '31%', marginBottom: 7, marginHorizontal: '1%',
    backgroundColor: C.cardBg, borderRadius: 10,
    borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const,
    boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
    padding: 12,
  }}>
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 5 }}>
      <View style={{ width: 4, height: 36, backgroundColor: accentColor, borderRadius: 2, marginRight: 8 }} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.textSec, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 2 }}>
          {label}
        </Text>
        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 24, color: C.textMain }}>
          {value}
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.textSec, textTransform: 'uppercase' as const, letterSpacing: 0.5 }}>
          {sub}
        </Text>
      </View>
    </View>
  </View>
);

// ─── COVER METRIC CARD ────────────────────────────────────────
const CoverMetric = ({ label, value, accentColor }: { label: string; value: number; accentColor: string }) => (
  <View style={{
    width: '45%', marginHorizontal: '2.5%', marginBottom: 7,
    backgroundColor: C.cardBg, borderRadius: 8,
    borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const,
    flexDirection: 'row' as const, alignItems: 'center' as const,
    paddingVertical: 9, paddingHorizontal: 10,
  }}>
    <View style={{ width: 4, height: 32, backgroundColor: accentColor, borderRadius: 2, marginRight: 10 }} />
    <View>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 22, color: C.textMain }}>{value}</Text>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.textSec, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>{label}</Text>
    </View>
  </View>
);

// ─── SECTION TITLE ────────────────────────────────────────────
const SectionTitle = ({
  title, badge, badgeColor, badgeCount
}: { title: string; badge?: string; badgeColor?: string; badgeCount?: number }) => (
  <View style={{ marginBottom: 12 }}>
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 8 }}>
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 18, color: C.textMain, flex: 1 }}>
        {title}
      </Text>
      {badge && (
        <View style={{ backgroundColor: badgeColor || C.blue, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, letterSpacing: 0.5 }}>
            {badgeCount} {badge}
          </Text>
        </View>
      )}
    </View>
    <View style={{ height: 1, backgroundColor: C.border }} />
  </View>
);

// ─── HORIZONTAL BAR ──────────────────────────────────────────
const HBar = ({ pct, color, h = 8 }: { pct: number; color: string; h?: number }) => (
  <View style={{ height: h, backgroundColor: C.border, borderRadius: 3, width: '100%', overflow: 'hidden' as const }}>
    <View style={{ height: h, backgroundColor: color, width: `${Math.min(Math.max(pct, 0), 100)}%`, borderRadius: 3 }} />
  </View>
);

// ─── STACKED BAR ──────────────────────────────────────────────
const StackedBar = ({ segs, h = 16 }: { segs: { pct: number; color: string }[]; h?: number }) => (
  <View style={{ height: h, width: '100%', flexDirection: 'row' as const, borderRadius: 4, overflow: 'hidden' as const, backgroundColor: C.border }}>
    {segs.map((s, i) => (
      <View key={i} style={{ height: h, width: `${s.pct}%`, backgroundColor: s.color }} />
    ))}
  </View>
);

// ─── SUBTASK LABEL ────────────────────────────────────────────
const subLabel = (subs: any[] | undefined): string => {
  if (!subs || subs.length === 0) return '—';
  const done = subs.filter((s: any) => s.completed).length;
  return `${done}/${subs.length}`;
};

const recLabel = (r: string | undefined): string => {
  const m: Record<string, string> = { diaria: 'DIARIA', semanal: 'SEMANAL', mensual: 'MENSUAL', none: '—' };
  return m[r || 'none'] || '—';
};

// ══════════════════════════════════════════════════════════════
// PROPS
// ══════════════════════════════════════════════════════════════
interface Props {
  data: {
    visitas?: any[];
    tareas?: any[];
    novedades?: any[];
    diligenciamientos?: any[];
    personal?: any[];
  };
  now: string;
  dateStr: string;
}

// ══════════════════════════════════════════════════════════════
// MAIN DOCUMENT
// ══════════════════════════════════════════════════════════════
export default function ReportPDF({ data, now, dateStr }: Props) {
  const vis  = data.visitas          || [];
  const tar  = data.tareas           || [];
  const nov  = data.novedades        || [];
  const dil  = data.diligenciamientos || [];
  const per  = data.personal         || [];

  const nV = vis.length;
  const nT = tar.length;
  const nN = nov.length;
  const nD = dil.length;
  const nP = per.length;
  const total = nV + nT + nN + nD + nP;

  // ── Task analytics
  const tComp   = tar.filter((t: any) => t.status === 'completado').length;
  const tProc   = tar.filter((t: any) => t.status === 'en_proceso').length;
  const tPend   = tar.filter((t: any) => t.status === 'pendiente').length;
  const pctComp = nT > 0 ? Math.round((tComp / nT) * 100) : 0;
  const pctProc = nT > 0 ? Math.round((tProc / nT) * 100) : 0;
  const pctPend = nT > 0 ? Math.round((tPend / nT) * 100) : 0;

  const tOverdue = tar.filter((t: any) => {
    if (!t.dueDate || t.status === 'completado') return false;
    return new Date(t.dueDate) < new Date();
  }).length;

  const pA = tar.filter((t: any) => t.priority === 'alta'  && t.status !== 'completado').length;
  const pM = tar.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length;
  const pB = tar.filter((t: any) => t.priority === 'baja'  && t.status !== 'completado').length;
  const pTot = pA + pM + pB || 1;

  const tRecur = tar.filter((t: any) => t.recurrence && t.recurrence !== 'none').length;

  const totalSubs     = tar.reduce((a: number, t: any) => a + (t.subtasks?.length || 0), 0);
  const completedSubs = tar.reduce((a: number, t: any) => a + (t.subtasks?.filter((s: any) => s.completed).length || 0), 0);

  const perActive = per.filter((p: any) => p.status === 'Activo').length;
  const perPct    = nP > 0 ? Math.round((perActive / nP) * 100) : 0;

  const dateUp = dateStr.toUpperCase();
  const docNum = `DOC-${new Date().toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}-${getDocNum()}`;

  // ── Recent activity
  const acts: { type: string; detail: string; fecha: string; color: string }[] = [];
  vis.slice(0, 2).forEach((v: any) => acts.push({
    type: 'VISITA', detail: `${v.origen || '—'} → ${v.destino || '—'}`, fecha: up(v.fecha), color: C.blue,
  }));
  tar.slice(0, 2).forEach((t: any) => acts.push({
    type: 'TAREA', detail: t.title || '—', fecha: 'N/A', color: C.green,
  }));
  nov.slice(0, 1).forEach((n: any) => acts.push({
    type: 'NOVEDAD', detail: n.title || '—', fecha: 'N/A', color: C.textMain,
  }));

  // ── Table widths (pts, A4 content width ~565pt at 15mm margins = ~510 usable)
  // Visitas: 7 cols
  const vW = [18, 40, 40, 58, 45, 120, 162]; // sum ~483
  const vCols = ['#', 'ORIGEN', 'DESTINO', 'FECHA', 'HORA', 'RESPONSABLE', 'OBSERVACIONES'];

  // Tareas: 7 cols
  const tW = [18, 170, 72, 55, 42, 65, 42]; // sum ~464
  const tCols = ['#', 'TÍTULO / CATEGORÍA', 'ESTADO', 'PRIORIDAD', 'VENC.', 'SUBTAREAS', 'RECUR.'];

  // Novedades: 5 cols
  const nW = [18, 130, 175, 70, 90]; // sum ~483
  const nCols = ['#', 'TÍTULO', 'CONTENIDO', 'FECHA', 'AUTOR'];

  // Diligenciamientos: 5 cols
  const dW = [18, 130, 185, 70, 90]; // sum ~493
  const dCols = ['#', 'TÍTULO', 'DETALLE', 'FECHA', 'AUTOR'];

  // Personal: 4 cols
  const pW = [18, 210, 130, 135]; // sum ~493
  const pCols = ['#', 'NOMBRE', 'ROL', 'ESTADO'];

  const PAGE_PAD_H = 20; // horizontal padding
  const PAGE_PAD_TOP = 46; // below fixed header
  const PAGE_PAD_BOT = 32; // above fixed footer

  return (
    <Document>
      {/* ═══════════════════════════════════════════════════════
          PÁGINA 1: PORTADA
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }}>
        {/* BLOQUE SUPERIOR — 60% height, navy */}
        <View style={{ height: '60%', backgroundColor: C.navy, alignItems: 'center' as const, justifyContent: 'center' as const, position: 'relative' as const }}>
          {/* Logo placeholder — show text PNA if image not found */}
          <View style={{ marginBottom: 12 }}>
            <Image
              src="/public/logo-pna.png"
              style={{ height: 90, objectFit: 'contain' as const }}
            />
          </View>

          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.white, letterSpacing: 8, textTransform: 'uppercase' as const, marginBottom: 16 }}>
            PREFECTURA NAVAL ARGENTINA
          </Text>

          <View style={{ flexDirection: 'row' as const }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 88, color: C.white, lineHeight: 0.95 }}>SGA</Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 88, color: C.blue, lineHeight: 0.95 }}>PZBP</Text>
          </View>

          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.white, letterSpacing: 5, textTransform: 'uppercase' as const, marginTop: 10 }}>
            SISTEMA DE GESTIÓN DE ACTIVIDADES
          </Text>

          {/* QR Decorative — bottom right */}
          <View style={{ position: 'absolute' as const, bottom: 16, right: 24 }}>
            <QRMark size={48} />
          </View>
        </View>

        {/* BLOQUE INFERIOR — 40% height, crema */}
        <View style={{ height: '40%', backgroundColor: C.pageBg, paddingHorizontal: 36, paddingTop: 20 }}>
          {/* Badge */}
          <View style={{ alignItems: 'center' as const, marginBottom: 18 }}>
            <View style={{ borderWidth: 2, borderColor: C.textMain, borderStyle: 'solid' as const, paddingHorizontal: 24, paddingVertical: 7 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.textMain, letterSpacing: 5, textTransform: 'uppercase' as const }}>
                REPORTE COMPLETO
              </Text>
            </View>
          </View>

          {/* Metrics grid 2×3 */}
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const }}>
            <CoverMetric label="VISITAS"      value={nV} accentColor={C.blue}    />
            <CoverMetric label="TAREAS"       value={nT} accentColor={C.green}   />
            <CoverMetric label="PERSONAL"     value={nP} accentColor={C.amber}   />
            <CoverMetric label="NOVEDADES"    value={nN} accentColor={C.textMain}/>
            <CoverMetric label="DILIGENCIAS"  value={nD} accentColor={C.purple}  />
          </View>

          {/* Separator */}
          <View style={{ height: 1, backgroundColor: C.border, marginVertical: 10, marginHorizontal: 10 }} />

          {/* Total + Date */}
          <View style={{ alignItems: 'center' as const }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 9, color: C.textSec, textTransform: 'uppercase' as const, letterSpacing: 1.5 }}>
              TOTAL DE REGISTROS
            </Text>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 56, color: C.textMain }}>
              {total}
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.textSec }}>
              GENERADO EL {now.toUpperCase()}  |  {dateUp}
            </Text>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 2: TABLA DE CONTENIDOS
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }}>
        <PageHeader section="TABLA DE CONTENIDOS" date={dateUp} docNum={docNum} />
        <PageFooter />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT }}>
          {/* Title */}
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 24, color: C.textMain, marginBottom: 4 }}>
            TABLA DE CONTENIDOS
          </Text>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 9, color: C.textSec, letterSpacing: 1, marginBottom: 18 }}>
            ESTRUCTURA DEL REPORTE — {total} REGISTROS TOTALES
          </Text>

          {/* TOC Entries */}
          {[
            { n: '01', title: 'PORTADA',            page: '1', accent: C.textMain },
            { n: '02', title: 'TABLA DE CONTENIDOS',page: '2', accent: C.textMain },
            { n: '03', title: 'RESUMEN EJECUTIVO',  page: '3', accent: C.blue    },
            { n: '04', title: 'INDICADORES CLAVE',  page: '4', accent: C.blue    },
            { n: '05', title: 'VISITAS TÉCNICAS',   page: '5', accent: C.blue    },
            { n: '06', title: 'TAREAS OPERATIVAS',  page: '6', accent: C.green   },
            { n: '07', title: 'NOVEDADES',          page: '7', accent: C.textMain },
            { n: '08', title: 'DILIGENCIAMIENTOS',  page: '8', accent: C.purple  },
            { n: '09', title: 'PERSONAL ACTIVO',    page: '9', accent: C.amber   },
          ].map((entry, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row' as const, alignItems: 'center' as const,
                paddingVertical: 11, paddingHorizontal: 14,
                backgroundColor: i % 2 === 0 ? C.white : C.rowAlt,
                borderLeftWidth: 4, borderLeftColor: entry.accent, borderLeftStyle: 'solid' as const,
                borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' as const,
                marginBottom: 2, borderRadius: 4,
              }}
            >
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 13, color: C.textSec, width: 32, opacity: 0.5 }}>
                {entry.n}
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.textMain, flex: 1, letterSpacing: 1.5, textTransform: 'uppercase' as const }}>
                {entry.title}
              </Text>
              {/* Dotted fill */}
              <View style={{ flex: 2, borderBottomWidth: 1, borderBottomColor: C.red, borderBottomStyle: 'dashed' as const, marginHorizontal: 12, height: 1 }} />
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.textSec, width: 20, textAlign: 'right' as const }}>
                {entry.page}
              </Text>
            </View>
          ))}

          {/* Footer info */}
          <View style={{ marginTop: 22, flexDirection: 'row' as const, justifyContent: 'space-between' as const, alignItems: 'center' as const, paddingHorizontal: 6 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.blue, letterSpacing: 0.5 }}>
              DOCUMENTO GENERADO POR / SISTEMA DE GESTIÓN DE ACTIVIDADES
            </Text>
            <View style={{ backgroundColor: C.textMain, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 4 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, letterSpacing: 1.5 }}>
                USO INTERNO
              </Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 3: RESUMEN EJECUTIVO
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }}>
        <PageHeader section="RESUMEN EJECUTIVO" date={dateUp} docNum={docNum} />
        <PageFooter />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT, position: 'relative' as const }}>
          <SectionTitle title="RESUMEN EJECUTIVO" />

          {/* KPI Grid 3×3 */}
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, marginBottom: 6 }}>
            <KpiCard label="TOTAL REGISTROS"     value={total}                sub="EN TODAS LAS FUENTES"               accentColor={C.blue}     />
            <KpiCard label="TASA COMPLETITUD"    value={`${pctComp}%`}        sub={`${tComp} DE ${nT} TAREAS`}         accentColor={C.amber}    />
            <KpiCard label="TAREAS VENCIDAS"     value={tOverdue}             sub={tOverdue > 0 ? 'REQUIEREN ATENCIÓN' : 'SIN VENCIMIENTOS'} accentColor={tOverdue > 0 ? C.red : C.green} />
            <KpiCard label="VISITAS TÉCNICAS"    value={nV}                   sub="REGISTROS DE CAMPO"                 accentColor={C.blue}     />
            <KpiCard label="PERSONAL ACTIVO"     value={`${perActive}/${nP}`} sub={`${perPct}% OPERATIVO`}             accentColor={C.amber}    />
            <KpiCard label="TAREAS RECURRENTES"  value={tRecur}               sub={`DE ${nT} TOTALES`}                 accentColor={C.gray}     />
            <KpiCard label="NOVEDADES"           value={nN}                   sub="COMUNICACIONES"                     accentColor={C.textMain} />
            <KpiCard label="DILIGENCIAMIENTOS"   value={nD}                   sub="TRÁMITES REGISTRADOS"               accentColor={C.purple}   />
            <KpiCard label="SUBTAREAS"           value={`${completedSubs}/${totalSubs}`} sub={totalSubs > 0 ? `${Math.round((completedSubs / (totalSubs || 1)) * 100)}% COMPLETADAS` : 'SIN SUBTAREAS'} accentColor={C.green} />
          </View>

          {/* Task status distribution */}
          <View style={{
            backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border,
            borderStyle: 'solid' as const, padding: 12, marginBottom: 8,
          }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
              DISTRIBUCIÓN POR ESTADO DE TAREAS
            </Text>
            <StackedBar segs={[
              { pct: pctComp, color: C.green },
              { pct: pctProc, color: C.blue  },
              { pct: pctPend, color: C.gray  },
            ]} h={14} />
            <View style={{ flexDirection: 'row' as const, marginTop: 7, gap: 18 }}>
              {[
                { label: 'COMPLETADAS', val: tComp, pct: pctComp, color: C.green },
                { label: 'EN PROCESO',  val: tProc, pct: pctProc, color: C.blue  },
                { label: 'PENDIENTES',  val: tPend, pct: pctPend, color: C.gray  },
              ].map((item, i) => (
                <View key={i} style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                  <View style={{ width: 9, height: 9, backgroundColor: item.color, borderRadius: 2, marginRight: 5 }} />
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.textMain }}>
                    {item.label}  {item.val} ({item.pct}%)
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Module distribution */}
          <View style={{
            backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border,
            borderStyle: 'solid' as const, padding: 12,
          }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
              DISTRIBUCIÓN POR MÓDULO
            </Text>
            {[
              { label: 'VISITAS',           val: nV, color: C.blue     },
              { label: 'TAREAS',            val: nT, color: C.green    },
              { label: 'PERSONAL',          val: nP, color: C.amber    },
              { label: 'NOVEDADES',         val: nN, color: C.textMain },
              { label: 'DILIGENCIAMIENTOS', val: nD, color: C.purple   },
            ].map((mod, i) => (
              <View key={i} style={{ marginBottom: 5 }}>
                <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 2 }}>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.textMain }}>{mod.label}</Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: mod.color }}>{mod.val}</Text>
                </View>
                <HBar pct={total > 0 ? (mod.val / total) * 100 : 0} color={mod.color} h={7} />
              </View>
            ))}
          </View>

          <VerifiedStamp id="HNBIVU7V" />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 4: INDICADORES CLAVE
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }}>
        <PageHeader section="INDICADORES CLAVE" date={dateUp} docNum={docNum} />
        <PageFooter />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT, position: 'relative' as const }}>
          <SectionTitle title="INDICADORES CLAVE" />

          {/* 4 indicator blocks */}
          <View style={{ flexDirection: 'row' as const, marginBottom: 14, gap: 8 }}>
            {/* [1] Estado de Tareas */}
            <View style={{ flex: 1, backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, padding: 12 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' as const, paddingBottom: 6 }}>
                ESTADO DE TAREAS
              </Text>
              {[
                { l: 'COMPLETADAS', v: tComp, c: C.green },
                { l: 'EN PROCESO',  v: tProc, c: C.amber },
                { l: 'PENDIENTES',  v: tPend, c: C.gray  },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 3 }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5.5, color: C.textSec, textTransform: 'uppercase' as const }}>{item.l}</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: item.c }}>{item.v}</Text>
                  </View>
                  <HBar pct={nT > 0 ? (item.v / nT) * 100 : 0} color={item.c} h={5} />
                </View>
              ))}
            </View>

            {/* [2] Completitud */}
            <View style={{ flex: 1, backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, padding: 12, alignItems: 'center' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' as const, paddingBottom: 6, alignSelf: 'stretch' as const }}>
                COMPLETITUD
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 46, color: C.amber, textAlign: 'center' as const, marginTop: 4 }}>
                {pctComp}<Text style={{ fontSize: 20 }}>%</Text>
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.textSec, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginBottom: 6, marginTop: 2 }}>
                TAREAS COMPLETADAS
              </Text>
              <HBar pct={pctComp} color={C.amber} h={8} />
            </View>

            {/* [3] Prioridad Activa */}
            <View style={{ flex: 1, backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, padding: 12 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 10, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' as const, paddingBottom: 6 }}>
                PRIORIDAD ACTIVA
              </Text>
              {[
                { l: 'ALTA',  v: pA, c: C.red   },
                { l: 'MEDIA', v: pM, c: C.amber  },
                { l: 'BAJA',  v: pB, c: C.green  },
              ].map((item, i) => (
                <View key={i} style={{ marginBottom: 7 }}>
                  <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 3 }}>
                    <View style={{ backgroundColor: item.c, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 2, marginRight: 5 }}>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 5.5, color: C.white }}>{item.l}</Text>
                    </View>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: item.c }}>{item.v}</Text>
                  </View>
                  <HBar pct={pTot > 0 ? (item.v / pTot) * 100 : 0} color={item.c} h={5} />
                </View>
              ))}
            </View>

            {/* [4] Vencidas */}
            <View style={{ flex: 1, backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, padding: 12, alignItems: 'center' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8, borderBottomWidth: 1, borderBottomColor: C.border, borderBottomStyle: 'solid' as const, paddingBottom: 6, alignSelf: 'stretch' as const }}>
                VENCIDAS
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 46, color: tOverdue > 0 ? C.red : C.green, textAlign: 'center' as const, marginTop: 4 }}>
                {tOverdue}
              </Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.textSec, textTransform: 'uppercase' as const, letterSpacing: 0.8, marginTop: 2 }}>
                {tOverdue > 0 ? 'ACCIÓN REQUERIDA' : 'SIN VENCIMIENTOS'}
              </Text>
            </View>
          </View>

          {/* Actividad Reciente */}
          <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 11, color: C.textMain, letterSpacing: 1, textTransform: 'uppercase' as const, marginBottom: 8 }}>
            ACTIVIDAD RECIENTE
          </Text>

          <View style={{ backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, overflow: 'hidden' as const }}>
            {/* Table header */}
            <View style={{ flexDirection: 'row' as const, backgroundColor: C.navy, paddingVertical: 6, paddingHorizontal: 12 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, width: 70, textTransform: 'uppercase' as const }}>TIPO</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, flex: 1, textTransform: 'uppercase' as const }}>DESCRIPCIÓN</Text>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, width: 65, textTransform: 'uppercase' as const, textAlign: 'right' as const }}>FECHA</Text>
            </View>
            {acts.slice(0, 5).map((a, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row' as const, alignItems: 'center' as const,
                  paddingVertical: 7, paddingHorizontal: 12,
                  backgroundColor: i % 2 === 0 ? C.white : C.rowAlt,
                  borderLeftWidth: 3, borderLeftColor: a.color, borderLeftStyle: 'solid' as const,
                  borderBottomWidth: i < acts.length - 1 ? 1 : 0,
                  borderBottomColor: C.border, borderBottomStyle: 'solid' as const,
                }}
                wrap={false}
              >
                <View style={{ width: 70 }}>
                  <View style={{ backgroundColor: a.color, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, alignSelf: 'flex-start' as const }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white, letterSpacing: 0.5 }}>{a.type}</Text>
                  </View>
                </View>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: C.textMain, flex: 1 }}>
                  {tr(a.detail, 60)}
                </Text>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.textSec, width: 65, textAlign: 'right' as const }}>{a.fecha}</Text>
              </View>
            ))}
          </View>

          <VerifiedStamp id="MNM4HO73" />
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 5: VISITAS TÉCNICAS
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }} wrap>
        <PageHeader section="VISITAS TÉCNICAS" date={dateUp} docNum={docNum} />
        <PageFooter />
        <Watermark />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT }}>
          <SectionTitle title="VISITAS TÉCNICAS" badge="REGISTROS" badgeColor={C.blue} badgeCount={nV} />

          <View style={{ backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, overflow: 'hidden' as const }}>
            <TableHeader cols={vCols} widths={vW} />
            {vis.map((v: any, i: number) => (
              <TableRow
                key={i}
                isAlt={i % 2 !== 0}
                widths={vW}
                highlight={i < 2}
                cells={[
                  <Text style={cellBold}>{i + 1}</Text>,
                  <Text style={cellText}>{tr(v.origen, 12)}</Text>,
                  <Text style={cellText}>{tr(v.destino, 12)}</Text>,
                  <Text style={cellText}>{tr(v.fecha, 12)}</Text>,
                  <Text style={cellText}>{tr(v.hora, 10)}</Text>,
                  <Text style={cellText}>{tr(v.responsable, 24)}</Text>,
                  <Text style={{ ...cellText, fontSize: 7, color: C.textSec }}>{tr(v.observaciones, 35)}</Text>,
                ]}
              />
            ))}
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 6: TAREAS OPERATIVAS
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }} wrap>
        <PageHeader section="TAREAS OPERATIVAS" date={dateUp} docNum={docNum} />
        <PageFooter />
        <Watermark />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT }}>
          <SectionTitle title="TAREAS OPERATIVAS" badge="REGISTROS" badgeColor={C.green} badgeCount={nT} />

          <View style={{ backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, overflow: 'hidden' as const }}>
            <TableHeader cols={tCols} widths={tW} />
            {tar.map((t: any, i: number) => {
              const sl = subLabel(t.subtasks);
              const slDone = sl !== '—' && sl.split('/').length === 2 &&
                sl.split('/')[0] === sl.split('/')[1];
              const slColor = sl === '—' ? C.textSec : slDone ? C.green : C.amber;

              return (
                <TableRow
                  key={i}
                  isAlt={i % 2 !== 0}
                  widths={tW}
                  cells={[
                    <Text style={cellBold}>{i + 1}</Text>,
                    <View>
                      <Text style={cellBold}>{tr(t.title, 34)}</Text>
                      {(t.tags?.[0] || t.category) && (
                        <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.textSec, fontStyle: 'italic' as const }}>
                          {tr(t.tags?.[0] || t.category, 22)}
                        </Text>
                      )}
                    </View>,
                    <StatusBadge status={t.status} />,
                    <PriorityBadge priority={t.priority} />,
                    <Text style={cellText}>{t.dueDate ? tr(t.dueDate, 12) : '—'}</Text>,
                    <Text style={{ ...cellBold, color: slColor }}>{sl}</Text>,
                    <Text style={cellText}>{recLabel(t.recurrence)}</Text>,
                  ]}
                />
              );
            })}
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 7: NOVEDADES
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }} wrap>
        <PageHeader section="NOVEDADES" date={dateUp} docNum={docNum} />
        <PageFooter />
        <Watermark />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT }}>
          <SectionTitle title="NOVEDADES" badge="REGISTROS" badgeColor={C.textMain} badgeCount={nN} />

          <View style={{ backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, overflow: 'hidden' as const }}>
            <TableHeader cols={nCols} widths={nW} />
            {nov.map((n: any, i: number) => (
              <TableRow
                key={i}
                isAlt={i % 2 !== 0}
                widths={nW}
                accentColor={C.textMain}
                cells={[
                  <Text style={cellBold}>{i + 1}</Text>,
                  <Text style={cellBold}>{tr(n.title, 26)}</Text>,
                  <Text style={{ ...cellText, color: C.textSec }}>{tr(n.content, 50)}</Text>,
                  <Text style={cellText}>{up(n.fecha || fmtDate(n.created_at || n.createdAt))}</Text>,
                  <Text style={cellText}>{tr(n.author_name || n.authorName, 20)}</Text>,
                ]}
              />
            ))}
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 8: DILIGENCIAMIENTOS
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }} wrap>
        <PageHeader section="DILIGENCIAMIENTOS" date={dateUp} docNum={docNum} />
        <PageFooter />
        <Watermark />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT }}>
          <SectionTitle title="DILIGENCIAMIENTOS" badge="REGISTROS" badgeColor={C.purple} badgeCount={nD} />

          <View style={{ backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, overflow: 'hidden' as const }}>
            <TableHeader cols={dCols} widths={dW} />
            {dil.map((d: any, i: number) => (
              <TableRow
                key={i}
                isAlt={i % 2 !== 0}
                widths={dW}
                accentColor={C.purple}
                cells={[
                  <Text style={cellBold}>{i + 1}</Text>,
                  <Text style={cellBold}>{tr(d.title, 26)}</Text>,
                  <Text style={{ ...cellText, color: C.textSec }}>{tr(d.content, 55)}</Text>,
                  <Text style={cellText}>{up(d.fecha || fmtDate(d.created_at || d.createdAt))}</Text>,
                  <Text style={cellText}>{tr(d.author_name || d.authorName, 20)}</Text>,
                ]}
              />
            ))}
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 9: PERSONAL ACTIVO
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, backgroundColor: C.pageBg }} wrap>
        <PageHeader section="PERSONAL ACTIVO" date={dateUp} docNum={docNum} />
        <PageFooter />
        <Watermark />

        <View style={{ paddingTop: PAGE_PAD_TOP, paddingHorizontal: PAGE_PAD_H, paddingBottom: PAGE_PAD_BOT }}>
          <SectionTitle title="PERSONAL ACTIVO" badge="REGISTROS" badgeColor={C.amber} badgeCount={nP} />

          <View style={{ backgroundColor: C.cardBg, borderRadius: 10, borderWidth: 1, borderColor: C.border, borderStyle: 'solid' as const, overflow: 'hidden' as const }}>
            <TableHeader cols={pCols} widths={pW} />
            {per.map((p: any, i: number) => (
              <TableRow
                key={i}
                isAlt={i % 2 !== 0}
                widths={pW}
                cells={[
                  <Text style={cellBold}>{i + 1}</Text>,
                  <Text style={cellBold}>{tr(p.name, 38)}</Text>,
                  <RoleBadge role={p.role} />,
                  <ActiveBadge status={p.status} />,
                ]}
              />
            ))}
          </View>

          {/* End of document marker */}
          <View style={{ marginTop: 28, alignItems: 'center' as const, paddingVertical: 14, backgroundColor: C.pageBg, borderRadius: 8 }}>
            <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.textSec, letterSpacing: 2, textTransform: 'uppercase' as const }}>
              FIN DEL DOCUMENTO — {dateUp}
            </Text>
          </View>
        </View>
      </Page>
    </Document>
  );
}
