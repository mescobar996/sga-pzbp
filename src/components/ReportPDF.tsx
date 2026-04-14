import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════
// BRAND COLORS — Brutalista Design System
// ═══════════════════════════════════════════════
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

// ═══════════════════════════════════════════════
// HELPER UTILITIES
// ═══════════════════════════════════════════════
const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('es-ES');
  } catch {
    return dateStr;
  }
};

const truncate = (str: string, max: number) =>
  str && str.length > max ? str.slice(0, max) + '…' : str || '—';

// ═══════════════════════════════════════════════
// REUSABLE SUB-COMPONENTS
// ═══════════════════════════════════════════════

/** Simulated brutalista offset shadow box */
const ShadowBox = ({
  children,
  bg = C.white,
  shadowColor = C.black,
  borderColor = C.black,
  style = {},
}: {
  children: React.ReactNode;
  bg?: string;
  shadowColor?: string;
  borderColor?: string;
  style?: any;
}) => (
  <View style={[{ position: 'relative' as const }, style]}>
    <View
      style={{
        position: 'absolute' as const,
        top: 3,
        left: 3,
        width: '100%',
        height: '100%',
        backgroundColor: shadowColor,
      }}
    />
    <View
      style={{
        position: 'relative' as const,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: borderColor,
        borderStyle: 'solid' as const,
      }}
    >
      {children}
    </View>
  </View>
);

/** Brutalista progress bar */
const ProgressBar = ({
  percent,
  color,
  height = 6,
  bgColor = '#e5e7eb',
}: {
  percent: number;
  color: string;
  height?: number;
  bgColor?: string;
}) => (
  <View style={{ height, backgroundColor: bgColor, width: '100%', marginTop: 3 }}>
    <View
      style={{
        height,
        backgroundColor: color,
        width: `${Math.min(Math.max(percent, 0), 100)}%`,
      }}
    />
  </View>
);

/** Fixed header for pages 2-7 */
const FixedHeader = ({ sectionName, dateStr }: { sectionName: string; dateStr: string }) => (
  <View
    style={{
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 28,
      backgroundColor: C.black,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
    }}
    fixed
  >
    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 10, color: C.white, letterSpacing: 1.5 }}>
      SGA PZBP
    </Text>
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.cream, marginRight: 10 }}>
        {sectionName}
      </Text>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.cream, opacity: 0.6 }}>
        {dateStr}
      </Text>
    </View>
  </View>
);

/** Fixed footer for pages 2-7 */
const FixedFooter = () => (
  <View
    style={{
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: 20,
      backgroundColor: C.cream,
      borderTopWidth: 1,
      borderTopColor: C.black,
      borderTopStyle: 'solid' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 20,
    }}
    fixed
  >
    <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}>
      SGA PZBP — Prefectura Naval Argentina
    </Text>
    <Text
      style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}
      render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`}
    />
  </View>
);

/** Section title bar with accent + badge */
const SectionTitle = ({
  title,
  count,
  accentColor,
}: {
  title: string;
  count: number;
  accentColor: string;
}) => (
  <View
    style={{
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      marginBottom: 10,
      marginTop: 4,
    }}
  >
    <View style={{ width: 4, height: 24, backgroundColor: accentColor, marginRight: 8 }} />
    <Text
      style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 14,
        color: C.black,
        textTransform: 'uppercase' as const,
        letterSpacing: 2,
      }}
    >
      {title}
    </Text>
    <View
      style={{
        marginLeft: 'auto',
        backgroundColor: accentColor,
        paddingHorizontal: 8,
        paddingVertical: 3,
      }}
    >
      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white, textTransform: 'uppercase' as const }}>
        {count} REGISTROS
      </Text>
    </View>
  </View>
);

/** Data table header row */
const DataTableHeader = ({
  cols,
  accentColor,
  widths,
}: {
  cols: string[];
  accentColor: string;
  widths: number[];
}) => (
  <View>
    <View
      style={{
        flexDirection: 'row' as const,
        backgroundColor: C.black,
        paddingVertical: 6,
        paddingHorizontal: 6,
      }}
    >
      {cols.map((c, i) => (
        <Text
          key={i}
          style={{
            width: widths[i],
            fontFamily: 'Helvetica-Bold',
            fontSize: 7,
            color: C.white,
            textTransform: 'uppercase' as const,
            letterSpacing: 0.8,
          }}
        >
          {c}
        </Text>
      ))}
    </View>
    <View style={{ height: 3, backgroundColor: accentColor }} />
  </View>
);

/** Data table row */
const DataTableRow = ({
  cells,
  widths,
  isAlt,
}: {
  cells: React.ReactNode[];
  widths: number[];
  isAlt: boolean;
}) => (
  <View
    style={{
      flexDirection: 'row' as const,
      backgroundColor: isAlt ? C.cream : C.white,
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(26,26,26,0.15)',
      borderBottomStyle: 'solid' as const,
    }}
    wrap={false}
  >
    {cells.map((cell, i) => (
      <View key={i} style={{ width: widths[i] }}>
        {cell}
      </View>
    ))}
  </View>
);

// ═══════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════
const s = StyleSheet.create({
  // Common text styles
  cellText: {
    fontFamily: 'Helvetica',
    fontSize: 7,
    color: C.black,
    textTransform: 'uppercase',
  },
  cellTextBold: {
    fontFamily: 'Helvetica-Bold',
    fontSize: 7,
    color: C.black,
    textTransform: 'uppercase',
  },
});

// ═══════════════════════════════════════════════
// STATUS & PRIORITY CELLS
// ═══════════════════════════════════════════════
const StatusCell = ({ status }: { status: string }) => {
  const labels: Record<string, string> = {
    pendiente: 'PENDIENTE',
    en_proceso: 'EN PROCESO',
    completado: 'COMPLETADO',
  };
  const colors: Record<string, string> = {
    pendiente: C.black,
    en_proceso: C.blue,
    completado: C.green,
  };
  const color = colors[status] || C.grey;
  const label = labels[status] || (status || '—').toUpperCase();

  return (
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
      {status === 'completado' || status === 'en_proceso' ? (
        <View
          style={{
            width: 5,
            height: 5,
            backgroundColor: color,
            marginRight: 3,
          }}
        />
      ) : null}
      <Text
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 7,
          color: color,
          textTransform: 'uppercase' as const,
          opacity: status === 'pendiente' ? 0.6 : 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

const PriorityCell = ({ priority }: { priority: string }) => {
  const color =
    priority === 'alta' ? C.red : priority === 'media' ? C.orange : C.green;
  return (
    <Text
      style={{
        fontFamily: priority === 'alta' ? 'Helvetica-Bold' : 'Helvetica',
        fontSize: 7,
        color,
        textTransform: 'uppercase' as const,
      }}
    >
      {(priority || '—').toUpperCase()}
    </Text>
  );
};

// ═══════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════
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
  // ── Data calculations ──
  const visitas = data.visitas || [];
  const tareas = data.tareas || [];
  const personal = data.personal || [];
  const novedades = data.novedades || [];
  const diligenciamientos = data.diligenciamientos || [];

  const totalVisitas = visitas.length;
  const totalTareas = tareas.length;
  const totalPersonal = personal.length;
  const totalNovedades = novedades.length;
  const totalDiligenciamientos = diligenciamientos.length;
  const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades + totalDiligenciamientos;

  const tareasCompletadas = tareas.filter((t: any) => t.status === 'completado').length;
  const tareasEnProceso = tareas.filter((t: any) => t.status === 'en_proceso').length;
  const tareasPendientes = tareas.filter((t: any) => t.status === 'pendiente').length;
  const tasaCompletitud = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

  const tareasAlta = tareas.filter((t: any) => t.priority === 'alta' && t.status !== 'completado').length;
  const tareasMedia = tareas.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length;
  const tareasBaja = tareas.filter((t: any) => t.priority === 'baja' && t.status !== 'completado').length;
  const totalActivePriority = tareasAlta + tareasMedia + tareasBaja;

  // ── Recent activity ──
  const activities: { date: string; type: string; detail: string; color: string }[] = [];
  visitas.slice(0, 2).forEach((v: any) =>
    activities.push({
      date: v.fecha || 'N/A',
      type: 'VISITA',
      detail: `${v.origen || 'N/A'} → ${v.destino || 'N/A'}`,
      color: C.blue,
    }),
  );
  tareas.slice(0, 2).forEach((t: any) =>
    activities.push({
      date: t.createdAt ? formatDate(t.createdAt) : 'N/A',
      type: 'TAREA',
      detail: t.title || 'Sin título',
      color: C.green,
    }),
  );
  novedades.slice(0, 1).forEach((n: any) =>
    activities.push({
      date: n.createdAt ? formatDate(n.createdAt) : 'N/A',
      type: 'NOVEDAD',
      detail: n.title || 'Sin título',
      color: C.black,
    }),
  );

  // ── KPI card items for cover ──
  const kpiItems = [
    { label: 'VISITAS', value: totalVisitas, color: C.blue },
    { label: 'TAREAS', value: totalTareas, color: C.green },
    { label: 'PERSONAL', value: totalPersonal, color: C.orange },
    { label: 'NOVEDADES', value: totalNovedades, color: C.black },
    { label: 'DILIGENCIAS', value: totalDiligenciamientos, color: C.purple },
  ];

  // ── Table column widths ──
  const visitasCols = ['#', 'ORIGEN', 'DESTINO', 'FECHA', 'HORA', 'RESPONSABLE'];
  const visitasWidths = [24, 110, 110, 65, 50, 110];
  const tareasCols = ['#', 'TÍTULO', 'ESTADO', 'PRIORIDAD', 'VENCIMIENTO'];
  const tareasWidths = [24, 200, 90, 75, 80];
  const novedadesCols = ['#', 'TÍTULO', 'FECHA', 'AUTOR'];
  const novedadesWidths = [24, 230, 110, 110];
  const diligCols = ['#', 'TÍTULO', 'FECHA', 'AUTOR'];
  const diligWidths = [24, 230, 110, 110];
  const personalCols = ['#', 'NOMBRE', 'ROL', 'ESTADO'];
  const personalWidths = [24, 200, 140, 110];

  const MAX_ROWS = 40;

  // Completitud color
  const completitudColor = tasaCompletitud > 70 ? C.green : tasaCompletitud > 40 ? C.orange : C.red;

  return (
    <Document>
      {/* ═════════════════════════════════════════════
          PÁGINA 1: PORTADA
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0 }}>
        {/* ── ZONA SUPERIOR: Crema (approx 40%) ── */}
        <View style={{ height: '40%', backgroundColor: C.cream, position: 'relative' as const }}>
          {/* Blue accent bar at top */}
          <View style={{ height: 8, backgroundColor: C.blue, width: '100%' }} />

          <View style={{ paddingHorizontal: 40, paddingTop: 30 }}>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 8,
                color: C.black,
                textTransform: 'uppercase' as const,
                letterSpacing: 4,
                marginBottom: 16,
              }}
            >
              PREFECTURA NAVAL ARGENTINA
            </Text>

            <View style={{ flexDirection: 'row' as const, marginBottom: 6 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 60, color: C.black, lineHeight: 1 }}>
                SGA
              </Text>
            </View>
            <View style={{ flexDirection: 'row' as const, marginBottom: 16 }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 60, color: C.blue, lineHeight: 1 }}>
                PZBP
              </Text>
            </View>

            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 11,
                color: C.black,
                textTransform: 'uppercase' as const,
                letterSpacing: 2,
              }}
            >
              SISTEMA DE GESTIÓN DE ACTIVIDADES
            </Text>
          </View>
        </View>

        {/* ── ZONA INFERIOR: Negro (approx 60%) ── */}
        <View style={{ height: '60%', backgroundColor: C.black, paddingHorizontal: 40, paddingTop: 24 }}>
          {/* Badge: REPORTE COMPLETO */}
          <View style={{ alignItems: 'center' as const, marginBottom: 18 }}>
            <View
              style={{
                borderWidth: 2,
                borderColor: C.white,
                borderStyle: 'solid' as const,
                paddingHorizontal: 20,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Helvetica-Bold',
                  fontSize: 10,
                  color: C.white,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 3,
                }}
              >
                REPORTE COMPLETO
              </Text>
            </View>
          </View>

          {/* KPI Grid: 2 columns */}
          <View style={{ flexDirection: 'row' as const, flexWrap: 'wrap' as const, justifyContent: 'center' as const }}>
            {kpiItems.map((item, idx) => (
              <View
                key={idx}
                style={{
                  width: '46%',
                  marginHorizontal: '2%',
                  marginBottom: 8,
                }}
              >
                <View
                  style={{
                    backgroundColor: C.cream,
                    borderWidth: 2,
                    borderColor: C.black,
                    borderStyle: 'solid' as const,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                  }}
                >
                  {/* Color accent left strip */}
                  <View
                    style={{
                      width: 4,
                      height: 30,
                      backgroundColor: item.color,
                      marginRight: 10,
                    }}
                  />
                  <View>
                    <Text
                      style={{
                        fontFamily: 'Helvetica-Bold',
                        fontSize: 24,
                        color: C.black,
                      }}
                    >
                      {item.value}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Helvetica',
                        fontSize: 7,
                        color: C.black,
                        textTransform: 'uppercase' as const,
                        letterSpacing: 1.5,
                        opacity: 0.7,
                      }}
                    >
                      {item.label}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Separator line */}
          <View
            style={{
              height: 1,
              backgroundColor: C.white,
              opacity: 0.3,
              marginVertical: 14,
              marginHorizontal: 20,
            }}
          />

          {/* Total records */}
          <View style={{ alignItems: 'center' as const }}>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 8,
                color: C.white,
                textTransform: 'uppercase' as const,
                letterSpacing: 2,
                marginBottom: 4,
              }}
            >
              TOTAL DE REGISTROS
            </Text>
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 28,
                color: C.white,
              }}
            >
              {totalRecords}
            </Text>
          </View>

          {/* Date */}
          <View style={{ alignItems: 'center' as const, marginTop: 12 }}>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 8,
                color: C.cream,
                opacity: 0.6,
              }}
            >
              Generado el {now}
            </Text>
          </View>
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 2: INDICADORES CLAVE
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader sectionName="INDICADORES CLAVE" dateStr={dateStr} />
        <FixedFooter />

        <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 30 }}>
          {/* Section title */}
          <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 14 }}>
            <View style={{ width: 4, height: 20, backgroundColor: C.blue, marginRight: 8 }} />
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 16,
                color: C.black,
                textTransform: 'uppercase' as const,
                letterSpacing: 2,
              }}
            >
              INDICADORES CLAVE
            </Text>
          </View>

          {/* 3 Indicator cards row */}
          <View style={{ flexDirection: 'row' as const, marginBottom: 16 }}>
            {/* CARD 1: Estado de Tareas */}
            <View style={{ width: '33%', paddingRight: 6 }}>
              <ShadowBox>
                <View style={{ padding: 10, backgroundColor: C.cream }}>
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 9,
                      color: C.black,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    ESTADO DE TAREAS
                  </Text>

                  {/* Completadas */}
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 2 }}>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.black, textTransform: 'uppercase' as const }}>
                        COMPLETADAS
                      </Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.green }}>
                        {tareasCompletadas}
                      </Text>
                    </View>
                    <ProgressBar
                      percent={totalTareas > 0 ? (tareasCompletadas / totalTareas) * 100 : 0}
                      color={C.green}
                    />
                  </View>

                  {/* En Proceso */}
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 2 }}>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.black, textTransform: 'uppercase' as const }}>
                        EN PROCESO
                      </Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.blue }}>
                        {tareasEnProceso}
                      </Text>
                    </View>
                    <ProgressBar
                      percent={totalTareas > 0 ? (tareasEnProceso / totalTareas) * 100 : 0}
                      color={C.blue}
                    />
                  </View>

                  {/* Pendientes */}
                  <View>
                    <View style={{ flexDirection: 'row' as const, justifyContent: 'space-between' as const, marginBottom: 2 }}>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.black, textTransform: 'uppercase' as const }}>
                        PENDIENTES
                      </Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.black }}>
                        {tareasPendientes}
                      </Text>
                    </View>
                    <View style={{ height: 6, borderWidth: 1, borderColor: C.black, borderStyle: 'solid' as const, width: '100%', marginTop: 3 }}>
                      <View
                        style={{
                          height: '100%',
                          backgroundColor: C.cream,
                          width: `${totalTareas > 0 ? (tareasPendientes / totalTareas) * 100 : 0}%`,
                        }}
                      />
                    </View>
                  </View>
                </View>
              </ShadowBox>
            </View>

            {/* CARD 2: Tasa de Completitud */}
            <View style={{ width: '34%', paddingHorizontal: 3 }}>
              <ShadowBox>
                <View style={{ padding: 10, backgroundColor: C.cream, alignItems: 'center' as const }}>
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 9,
                      color: C.black,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1.5,
                      marginBottom: 6,
                      alignSelf: 'flex-start' as const,
                    }}
                  >
                    TASA DE COMPLETITUD
                  </Text>

                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 48,
                      color: completitudColor,
                      textAlign: 'center' as const,
                      marginVertical: 4,
                    }}
                  >
                    {tasaCompletitud}
                    <Text style={{ fontSize: 24 }}>%</Text>
                  </Text>

                  <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey, marginBottom: 6 }}>
                    de tareas completadas
                  </Text>

                  <ProgressBar percent={tasaCompletitud} color={completitudColor} height={12} />
                </View>
              </ShadowBox>
            </View>

            {/* CARD 3: Prioridad Activa */}
            <View style={{ width: '33%', paddingLeft: 6 }}>
              <ShadowBox>
                <View style={{ padding: 10, backgroundColor: C.cream }}>
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 9,
                      color: C.black,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1.5,
                      marginBottom: 10,
                    }}
                  >
                    PRIORIDAD ACTIVA
                  </Text>

                  {/* Alta */}
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 2 }}>
                      <View
                        style={{
                          backgroundColor: C.red,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          marginRight: 6,
                        }}
                      >
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white }}>ALTA</Text>
                      </View>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.red }}>
                        {tareasAlta}
                      </Text>
                    </View>
                    <ProgressBar
                      percent={totalActivePriority > 0 ? (tareasAlta / totalActivePriority) * 100 : 0}
                      color={C.red}
                    />
                  </View>

                  {/* Media */}
                  <View style={{ marginBottom: 8 }}>
                    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 2 }}>
                      <View
                        style={{
                          backgroundColor: C.orange,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          marginRight: 6,
                        }}
                      >
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white }}>MEDIA</Text>
                      </View>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.orange }}>
                        {tareasMedia}
                      </Text>
                    </View>
                    <ProgressBar
                      percent={totalActivePriority > 0 ? (tareasMedia / totalActivePriority) * 100 : 0}
                      color={C.orange}
                    />
                  </View>

                  {/* Baja */}
                  <View>
                    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 2 }}>
                      <View
                        style={{
                          backgroundColor: C.green,
                          paddingHorizontal: 5,
                          paddingVertical: 2,
                          marginRight: 6,
                        }}
                      >
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white }}>BAJA</Text>
                      </View>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.green }}>
                        {tareasBaja}
                      </Text>
                    </View>
                    <ProgressBar
                      percent={totalActivePriority > 0 ? (tareasBaja / totalActivePriority) * 100 : 0}
                      color={C.green}
                    />
                  </View>
                </View>
              </ShadowBox>
            </View>
          </View>

          {/* ACTIVIDAD RECIENTE */}
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const, marginBottom: 8 }}>
              <View style={{ width: 4, height: 16, backgroundColor: C.black, marginRight: 8 }} />
              <Text
                style={{
                  fontFamily: 'Helvetica-Bold',
                  fontSize: 11,
                  color: C.black,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 1.5,
                }}
              >
                ACTIVIDAD RECIENTE
              </Text>
            </View>

            {activities.slice(0, 5).map((a, i) => (
              <View
                key={i}
                style={{
                  flexDirection: 'row' as const,
                  alignItems: 'center' as const,
                  paddingVertical: 5,
                  paddingHorizontal: 8,
                  backgroundColor: i % 2 === 0 ? C.cream : C.white,
                  borderBottomWidth: 1,
                  borderBottomColor: 'rgba(26,26,26,0.1)',
                  borderBottomStyle: 'solid' as const,
                }}
              >
                {/* Color dot */}
                <View
                  style={{
                    width: 6,
                    height: 6,
                    backgroundColor: a.color,
                    marginRight: 6,
                  }}
                />
                {/* Type badge */}
                <View
                  style={{
                    backgroundColor: a.color,
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    marginRight: 8,
                  }}
                >
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white }}>
                    {a.type}
                  </Text>
                </View>
                {/* Detail */}
                <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.black, flex: 1 }}>
                  {truncate(a.detail, 60)}
                </Text>
                {/* Date */}
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey }}>
                  {a.date}
                </Text>
              </View>
            ))}
          </View>
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 3: VISITAS TÉCNICAS
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader sectionName="VISITAS TÉCNICAS" dateStr={dateStr} />
        <FixedFooter />

        <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 30 }}>
          <SectionTitle title="Visitas Técnicas" count={totalVisitas} accentColor={C.blue} />
          <DataTableHeader cols={visitasCols} accentColor={C.blue} widths={visitasWidths} />
          {visitas.slice(0, MAX_ROWS).map((v: any, i: number) => (
            <DataTableRow
              key={i}
              isAlt={i % 2 === 0}
              widths={visitasWidths}
              cells={[
                <Text style={s.cellText}>{i + 1}</Text>,
                <Text style={s.cellText}>{truncate(v.origen, 25)}</Text>,
                <Text style={s.cellText}>{truncate(v.destino, 25)}</Text>,
                <Text style={s.cellText}>{v.fecha || '—'}</Text>,
                <Text style={s.cellText}>{v.hora || '—'}</Text>,
                <Text style={s.cellText}>{truncate(v.responsable, 24)}</Text>,
              ]}
            />
          ))}
          {totalVisitas > MAX_ROWS && (
            <View style={{ paddingVertical: 6, alignItems: 'center' as const, backgroundColor: C.cream }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}>
                Mostrando {MAX_ROWS} de {totalVisitas} registros
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 4: TAREAS
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader sectionName="TAREAS OPERATIVAS" dateStr={dateStr} />
        <FixedFooter />

        <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 30 }}>
          <SectionTitle title="Tareas" count={totalTareas} accentColor={C.green} />
          <DataTableHeader cols={tareasCols} accentColor={C.green} widths={tareasWidths} />
          {tareas.slice(0, MAX_ROWS).map((t: any, i: number) => (
            <DataTableRow
              key={i}
              isAlt={i % 2 === 0}
              widths={tareasWidths}
              cells={[
                <Text style={s.cellText}>{i + 1}</Text>,
                <Text style={s.cellText}>{truncate(t.title, 45)}</Text>,
                <StatusCell status={t.status} />,
                <PriorityCell priority={t.priority} />,
                <Text style={s.cellText}>{t.dueDate || '—'}</Text>,
              ]}
            />
          ))}
          {totalTareas > MAX_ROWS && (
            <View style={{ paddingVertical: 6, alignItems: 'center' as const, backgroundColor: C.cream }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}>
                Mostrando {MAX_ROWS} de {totalTareas} registros
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 5: NOVEDADES
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader sectionName="NOVEDADES" dateStr={dateStr} />
        <FixedFooter />

        <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 30 }}>
          <SectionTitle title="Novedades" count={totalNovedades} accentColor={C.black} />
          <DataTableHeader cols={novedadesCols} accentColor={C.black} widths={novedadesWidths} />
          {novedades.slice(0, MAX_ROWS).map((n: any, i: number) => (
            <DataTableRow
              key={i}
              isAlt={i % 2 === 0}
              widths={novedadesWidths}
              cells={[
                <Text style={s.cellText}>{i + 1}</Text>,
                <Text style={s.cellText}>{truncate(n.title, 50)}</Text>,
                <Text style={s.cellText}>{n.fecha || formatDate(n.created_at || n.createdAt)}</Text>,
                <Text style={s.cellText}>{truncate(n.author_name || n.authorName, 24)}</Text>,
              ]}
            />
          ))}
          {totalNovedades > MAX_ROWS && (
            <View style={{ paddingVertical: 6, alignItems: 'center' as const, backgroundColor: C.cream }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}>
                Mostrando {MAX_ROWS} de {totalNovedades} registros
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 6: DILIGENCIAMIENTOS
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader sectionName="DILIGENCIAMIENTOS" dateStr={dateStr} />
        <FixedFooter />

        <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 30 }}>
          <SectionTitle title="Diligenciamientos" count={totalDiligenciamientos} accentColor={C.purple} />
          <DataTableHeader cols={diligCols} accentColor={C.purple} widths={diligWidths} />
          {diligenciamientos.slice(0, MAX_ROWS).map((d: any, i: number) => (
            <DataTableRow
              key={i}
              isAlt={i % 2 === 0}
              widths={diligWidths}
              cells={[
                <Text style={s.cellText}>{i + 1}</Text>,
                <Text style={s.cellText}>{truncate(d.title, 50)}</Text>,
                <Text style={s.cellText}>{d.fecha || formatDate(d.created_at || d.createdAt)}</Text>,
                <Text style={s.cellText}>{truncate(d.author_name || d.authorName, 24)}</Text>,
              ]}
            />
          ))}
          {totalDiligenciamientos > MAX_ROWS && (
            <View style={{ paddingVertical: 6, alignItems: 'center' as const, backgroundColor: C.cream }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}>
                Mostrando {MAX_ROWS} de {totalDiligenciamientos} registros
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ═════════════════════════════════════════════
          PÁGINA 7: PERSONAL
          ═════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader sectionName="PERSONAL ACTIVO" dateStr={dateStr} />
        <FixedFooter />

        <View style={{ paddingTop: 44, paddingHorizontal: 24, paddingBottom: 30 }}>
          <SectionTitle title="Personal" count={totalPersonal} accentColor={C.orange} />
          <DataTableHeader cols={personalCols} accentColor={C.orange} widths={personalWidths} />
          {personal.slice(0, MAX_ROWS).map((p: any, i: number) => (
            <DataTableRow
              key={i}
              isAlt={i % 2 === 0}
              widths={personalWidths}
              cells={[
                <Text style={s.cellText}>{i + 1}</Text>,
                <Text style={s.cellText}>{truncate(p.name, 40)}</Text>,
                <Text style={s.cellText}>{truncate(p.role, 30)}</Text>,
                <Text
                  style={{
                    ...s.cellText,
                    color: p.status === 'Activo' ? C.green : C.red,
                    fontFamily: 'Helvetica-Bold',
                  }}
                >
                  {(p.status || '—').toUpperCase()}
                </Text>,
              ]}
            />
          ))}
          {totalPersonal > MAX_ROWS && (
            <View style={{ paddingVertical: 6, alignItems: 'center' as const, backgroundColor: C.cream }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.grey }}>
                Mostrando {MAX_ROWS} de {totalPersonal} registros
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
