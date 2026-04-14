import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════
// BRAND COLORS — SGA PZBP Brutalista Design
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
// HELPERS
// ═══════════════════════════════════════════════
const up = (str: string | undefined | null): string =>
  (str || '—').toUpperCase();

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.toUpperCase();
    return d.toLocaleDateString('es-ES').toUpperCase();
  } catch {
    return dateStr.toUpperCase();
  }
};

const trunc = (str: string | undefined | null, max: number) => {
  const s = str || '—';
  return (s.length > max ? s.slice(0, max) + '…' : s).toUpperCase();
};

// ═══════════════════════════════════════════════
// BRUTALISTA SHADOW BOX
// Simulates the web's shadow-[4px_4px_0px_0px_rgba(26,26,26,0.3)]
// ═══════════════════════════════════════════════
const ShadowBox = ({
  children,
  bg = C.white,
  style = {},
}: {
  children: React.ReactNode;
  bg?: string;
  style?: any;
}) => (
  <View style={[{ position: 'relative' as const }, style]}>
    <View
      style={{
        position: 'absolute' as const,
        top: 4,
        left: 4,
        width: '100%',
        height: '100%',
        backgroundColor: C.black,
        opacity: 0.3,
      }}
    />
    <View
      style={{
        position: 'relative' as const,
        backgroundColor: bg,
        borderWidth: 2,
        borderColor: C.black,
        borderStyle: 'solid' as const,
      }}
    >
      {children}
    </View>
  </View>
);

// ═══════════════════════════════════════════════
// PROGRESS BAR (no border-radius — brutalista)
// ═══════════════════════════════════════════════
const Bar = ({
  pct,
  color,
  h = 6,
  bg = '#e5e7eb',
}: {
  pct: number;
  color: string;
  h?: number;
  bg?: string;
}) => (
  <View style={{ height: h, backgroundColor: bg, width: '100%' }}>
    <View
      style={{
        height: h,
        backgroundColor: color,
        width: `${Math.min(Math.max(pct, 0), 100)}%`,
      }}
    />
  </View>
);

// ═══════════════════════════════════════════════
// FIXED HEADER — matches web's top bar
// bg-[#1a1a1a] border-b-4 border-[#1a1a1a]
// ═══════════════════════════════════════════════
const FixedHeader = ({ section, date }: { section: string; date: string }) => (
  <View
    style={{
      position: 'absolute' as const,
      top: 0,
      left: 0,
      right: 0,
      height: 30,
      backgroundColor: C.black,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 24,
      borderBottomWidth: 4,
      borderBottomColor: C.blue,
      borderBottomStyle: 'solid' as const,
    }}
    fixed
  >
    <Text
      style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 10,
        color: C.white,
        letterSpacing: 2,
        textTransform: 'uppercase' as const,
      }}
    >
      SGA PZBP
    </Text>
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
      <Text
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 7,
          color: C.cream,
          letterSpacing: 1,
          textTransform: 'uppercase' as const,
          marginRight: 12,
        }}
      >
        {section}
      </Text>
      <Text
        style={{
          fontFamily: 'Helvetica',
          fontSize: 7,
          color: C.cream,
          opacity: 0.5,
          textTransform: 'uppercase' as const,
        }}
      >
        {date}
      </Text>
    </View>
  </View>
);

// ═══════════════════════════════════════════════
// FIXED FOOTER — matches web's cream bar with
// border-t-2 border-[#1a1a1a]
// ═══════════════════════════════════════════════
const FixedFooter = () => (
  <View
    style={{
      position: 'absolute' as const,
      bottom: 0,
      left: 0,
      right: 0,
      height: 22,
      backgroundColor: C.cream,
      borderTopWidth: 2,
      borderTopColor: C.black,
      borderTopStyle: 'solid' as const,
      flexDirection: 'row' as const,
      alignItems: 'center' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 24,
    }}
    fixed
  >
    <Text
      style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 6,
        color: C.grey,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
      }}
    >
      SGA PZBP — PREFECTURA NAVAL ARGENTINA
    </Text>
    <Text
      style={{
        fontFamily: 'Helvetica-Bold',
        fontSize: 6,
        color: C.grey,
        letterSpacing: 1,
        textTransform: 'uppercase' as const,
      }}
      render={({ pageNumber, totalPages }) =>
        `PÁGINA ${pageNumber} DE ${totalPages}`
      }
    />
  </View>
);

// ═══════════════════════════════════════════════
// SECTION TITLE — accent bar + title + badge
// Matches web's section headers with border-b-4
// ═══════════════════════════════════════════════
const SectionTitle = ({
  title,
  count,
  color,
}: {
  title: string;
  count: number;
  color: string;
}) => (
  <View style={{ marginBottom: 10, marginTop: 4 }}>
    <View
      style={{
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        paddingBottom: 6,
        borderBottomWidth: 4,
        borderBottomColor: C.black,
        borderBottomStyle: 'solid' as const,
      }}
    >
      <View
        style={{
          width: 4,
          height: 22,
          backgroundColor: color,
          marginRight: 8,
        }}
      />
      <Text
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 14,
          color: C.black,
          textTransform: 'uppercase' as const,
          letterSpacing: 2,
          flex: 1,
        }}
      >
        {title.toUpperCase()}
      </Text>
      <View
        style={{
          backgroundColor: color,
          paddingHorizontal: 8,
          paddingVertical: 3,
          borderWidth: 2,
          borderColor: C.black,
          borderStyle: 'solid' as const,
        }}
      >
        <Text
          style={{
            fontFamily: 'Helvetica-Bold',
            fontSize: 7,
            color: C.white,
            letterSpacing: 1,
            textTransform: 'uppercase' as const,
          }}
        >
          {count} REGISTROS
        </Text>
      </View>
    </View>
  </View>
);

// ═══════════════════════════════════════════════
// TABLE HEADER — black bg, white text, accent bottom
// Matches web's thead: bg-[#1a1a1a] text-white
// ═══════════════════════════════════════════════
const THead = ({
  cols,
  color,
  widths,
}: {
  cols: string[];
  color: string;
  widths: number[];
}) => (
  <View>
    <View
      style={{
        flexDirection: 'row' as const,
        backgroundColor: C.black,
        paddingVertical: 7,
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
            letterSpacing: 1.2,
          }}
        >
          {c}
        </Text>
      ))}
    </View>
    {/* Accent border-bottom like the web's colored underlines */}
    <View style={{ height: 3, backgroundColor: color }} />
  </View>
);

// ═══════════════════════════════════════════════
// TABLE ROW — alternating cream/white like the web
// border-b border-[#1a1a1a]/10 + bg alternating
// ═══════════════════════════════════════════════
const TRow = ({
  cells,
  widths,
  alt,
}: {
  cells: React.ReactNode[];
  widths: number[];
  alt: boolean;
}) => (
  <View
    style={{
      flexDirection: 'row' as const,
      backgroundColor: alt ? C.cream : C.white,
      paddingVertical: 5,
      paddingHorizontal: 6,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(26,26,26,0.12)',
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
// STATUS CELL — matches web's badge styling
// ═══════════════════════════════════════════════
const StatusCell = ({ status }: { status: string }) => {
  const cfg: Record<string, { label: string; color: string }> = {
    pendiente:  { label: 'PENDIENTE',  color: C.black },
    en_proceso: { label: 'EN PROCESO', color: C.blue },
    completado: { label: 'COMPLETADO', color: C.green },
  };
  const { label, color } = cfg[status] || { label: up(status), color: C.grey };

  return (
    <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
      {(status === 'completado' || status === 'en_proceso') && (
        <View
          style={{
            width: 6,
            height: 6,
            backgroundColor: color,
            marginRight: 4,
            borderWidth: 1,
            borderColor: C.black,
            borderStyle: 'solid' as const,
          }}
        />
      )}
      <Text
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 7,
          color: color,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.5,
          opacity: status === 'pendiente' ? 0.6 : 1,
        }}
      >
        {label}
      </Text>
    </View>
  );
};

// ═══════════════════════════════════════════════
// PRIORITY CELL — matches web's colored badges
// Alta=bg-[#e63b2e] Media=bg-[#0055ff] Baja=bg-[#00cc66]
// ═══════════════════════════════════════════════
const PriorityCell = ({ priority }: { priority: string }) => {
  const cfg: Record<string, { color: string; bg: string }> = {
    alta:  { color: C.white, bg: C.red },
    media: { color: C.white, bg: C.orange },
    baja:  { color: C.white, bg: C.green },
  };
  const { color, bg } = cfg[priority] || { color: C.black, bg: C.cream };

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: 6,
        paddingVertical: 2,
        alignSelf: 'flex-start' as const,
        borderWidth: 1,
        borderColor: C.black,
        borderStyle: 'solid' as const,
      }}
    >
      <Text
        style={{
          fontFamily: 'Helvetica-Bold',
          fontSize: 6,
          color: color,
          textTransform: 'uppercase' as const,
          letterSpacing: 0.8,
        }}
      >
        {up(priority)}
      </Text>
    </View>
  );
};

// Default cell text style
const ct = {
  fontFamily: 'Helvetica' as const,
  fontSize: 7,
  color: C.black,
  textTransform: 'uppercase' as const,
  letterSpacing: 0.3,
};

const ctBold = {
  ...ct,
  fontFamily: 'Helvetica-Bold' as const,
};

// ═══════════════════════════════════════════════
// MAIN EXPORT
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
  // ── Data ──
  const visitas = data.visitas || [];
  const tareas = data.tareas || [];
  const personal = data.personal || [];
  const novedades = data.novedades || [];
  const diligenciamientos = data.diligenciamientos || [];

  const tV = visitas.length;
  const tT = tareas.length;
  const tP = personal.length;
  const tN = novedades.length;
  const tD = diligenciamientos.length;
  const total = tV + tT + tP + tN + tD;

  const tComp = tareas.filter((t: any) => t.status === 'completado').length;
  const tProc = tareas.filter((t: any) => t.status === 'en_proceso').length;
  const tPend = tareas.filter((t: any) => t.status === 'pendiente').length;
  const pctComp = tT > 0 ? Math.round((tComp / tT) * 100) : 0;

  const pAlta = tareas.filter((t: any) => t.priority === 'alta' && t.status !== 'completado').length;
  const pMedia = tareas.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length;
  const pBaja = tareas.filter((t: any) => t.priority === 'baja' && t.status !== 'completado').length;
  const pTotal = pAlta + pMedia + pBaja;

  const compColor = pctComp > 70 ? C.green : pctComp > 40 ? C.orange : C.red;

  // Recent activity
  const acts: { date: string; type: string; detail: string; color: string }[] = [];
  visitas.slice(0, 2).forEach((v: any) =>
    acts.push({ date: v.fecha || 'N/A', type: 'VISITA', detail: `${v.origen || 'N/A'} → ${v.destino || 'N/A'}`, color: C.blue }),
  );
  tareas.slice(0, 2).forEach((t: any) =>
    acts.push({ date: t.createdAt ? formatDate(t.createdAt) : 'N/A', type: 'TAREA', detail: t.title || 'SIN TÍTULO', color: C.green }),
  );
  novedades.slice(0, 1).forEach((n: any) =>
    acts.push({ date: n.createdAt ? formatDate(n.createdAt) : 'N/A', type: 'NOVEDAD', detail: n.title || 'SIN TÍTULO', color: C.black }),
  );

  // Cover KPIs
  const kpis = [
    { label: 'VISITAS', value: tV, color: C.blue },
    { label: 'TAREAS', value: tT, color: C.green },
    { label: 'PERSONAL', value: tP, color: C.orange },
    { label: 'NOVEDADES', value: tN, color: C.black },
    { label: 'DILIGENCIAS', value: tD, color: C.purple },
  ];

  // Table column configs
  const vCols = ['#', 'ORIGEN', 'DESTINO', 'FECHA', 'HORA', 'RESPONSABLE'];
  const vW = [22, 110, 110, 60, 45, 120];
  const tCols = ['#', 'TÍTULO', 'ESTADO', 'PRIORIDAD', 'VENCIMIENTO'];
  const tW = [22, 195, 90, 80, 80];
  const nCols = ['#', 'TÍTULO', 'FECHA', 'AUTOR'];
  const nW = [22, 230, 108, 108];
  const dCols = ['#', 'TÍTULO', 'FECHA', 'AUTOR'];
  const dW = [22, 230, 108, 108];
  const pCols = ['#', 'NOMBRE', 'ROL', 'ESTADO'];
  const pW = [22, 200, 140, 106];

  const MAX = 40;

  return (
    <Document>
      {/* ════════════════════════════════════════════
          PÁGINA 1: PORTADA
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0 }}>
        {/* ZONA SUPERIOR — CREMA */}
        <View style={{ height: '40%', backgroundColor: C.cream, position: 'relative' as const }}>
          {/* Blue accent bar — like the web's border-b-4 border-[#0055ff] */}
          <View style={{ height: 8, backgroundColor: C.blue, width: '100%' }} />

          <View style={{ paddingHorizontal: 40, paddingTop: 28 }}>
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 8,
                color: C.black,
                textTransform: 'uppercase' as const,
                letterSpacing: 5,
                marginBottom: 14,
                opacity: 0.7,
              }}
            >
              PREFECTURA NAVAL ARGENTINA
            </Text>

            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 60,
                color: C.black,
                lineHeight: 1,
                marginBottom: 2,
              }}
            >
              SGA
            </Text>
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 60,
                color: C.blue,
                lineHeight: 1,
                marginBottom: 14,
              }}
            >
              PZBP
            </Text>

            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 11,
                color: C.black,
                textTransform: 'uppercase' as const,
                letterSpacing: 3,
              }}
            >
              SISTEMA DE GESTIÓN DE ACTIVIDADES
            </Text>
          </View>
        </View>

        {/* ZONA INFERIOR — NEGRO */}
        <View
          style={{
            height: '60%',
            backgroundColor: C.black,
            paddingHorizontal: 40,
            paddingTop: 22,
          }}
        >
          {/* Badge — matches web's border-2 border-white */}
          <View style={{ alignItems: 'center' as const, marginBottom: 16 }}>
            <View
              style={{
                borderWidth: 2,
                borderColor: C.white,
                borderStyle: 'solid' as const,
                paddingHorizontal: 24,
                paddingVertical: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: 'Helvetica-Bold',
                  fontSize: 10,
                  color: C.white,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 4,
                }}
              >
                REPORTE COMPLETO
              </Text>
            </View>
          </View>

          {/* KPI GRID — 2 columns like web's grid-cols-2 */}
          <View
            style={{
              flexDirection: 'row' as const,
              flexWrap: 'wrap' as const,
              justifyContent: 'center' as const,
            }}
          >
            {kpis.map((k, idx) => (
              <View
                key={idx}
                style={{
                  width: '46%',
                  marginHorizontal: '2%',
                  marginBottom: 8,
                }}
              >
                {/* Card with accent strip like web's summary cards */}
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
                  {/* Color accent left like web's icon bg */}
                  <View
                    style={{
                      width: 4,
                      height: 28,
                      backgroundColor: k.color,
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
                      {k.value}
                    </Text>
                    <Text
                      style={{
                        fontFamily: 'Helvetica-Bold',
                        fontSize: 7,
                        color: C.black,
                        textTransform: 'uppercase' as const,
                        letterSpacing: 2,
                        opacity: 0.6,
                      }}
                    >
                      {k.label}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Separator */}
          <View
            style={{
              height: 2,
              backgroundColor: C.white,
              opacity: 0.2,
              marginVertical: 12,
              marginHorizontal: 20,
            }}
          />

          {/* Total */}
          <View style={{ alignItems: 'center' as const }}>
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 8,
                color: C.white,
                textTransform: 'uppercase' as const,
                letterSpacing: 3,
                marginBottom: 4,
                opacity: 0.7,
              }}
            >
              TOTAL DE REGISTROS
            </Text>
            <Text
              style={{
                fontFamily: 'Helvetica-Bold',
                fontSize: 32,
                color: C.white,
              }}
            >
              {total}
            </Text>
          </View>

          {/* Date */}
          <View style={{ alignItems: 'center' as const, marginTop: 10 }}>
            <Text
              style={{
                fontFamily: 'Helvetica',
                fontSize: 7,
                color: C.cream,
                opacity: 0.5,
                textTransform: 'uppercase' as const,
                letterSpacing: 1,
              }}
            >
              GENERADO EL {now.toUpperCase()}
            </Text>
          </View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════
          PÁGINA 2: INDICADORES CLAVE
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader section="INDICADORES CLAVE" date={dateStr.toUpperCase()} />
        <FixedFooter />

        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          {/* Section title with bottom border like web */}
          <View
            style={{
              flexDirection: 'row' as const,
              alignItems: 'center' as const,
              marginBottom: 14,
              paddingBottom: 6,
              borderBottomWidth: 4,
              borderBottomColor: C.black,
              borderBottomStyle: 'solid' as const,
            }}
          >
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

          {/* 3 INDICATOR CARDS — like web's grid-cols-3 with shadow boxes */}
          <View style={{ flexDirection: 'row' as const, marginBottom: 16 }}>
            {/* CARD 1: ESTADO DE TAREAS */}
            <View style={{ width: '33%', paddingRight: 5 }}>
              <ShadowBox bg={C.white}>
                <View style={{ padding: 10 }}>
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 8,
                      color: C.black,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1.5,
                      marginBottom: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: C.black,
                      borderBottomStyle: 'solid' as const,
                      paddingBottom: 4,
                    }}
                  >
                    ESTADO DE TAREAS
                  </Text>

                  {[
                    { label: 'COMPLETADAS', val: tComp, color: C.green },
                    { label: 'EN PROCESO', val: tProc, color: C.blue },
                    { label: 'PENDIENTES', val: tPend, color: C.cream },
                  ].map((item, i) => (
                    <View key={i} style={{ marginBottom: i < 2 ? 8 : 0 }}>
                      <View
                        style={{
                          flexDirection: 'row' as const,
                          justifyContent: 'space-between' as const,
                          marginBottom: 3,
                        }}
                      >
                        <Text
                          style={{
                            fontFamily: 'Helvetica-Bold',
                            fontSize: 6,
                            color: C.black,
                            textTransform: 'uppercase' as const,
                            letterSpacing: 0.8,
                          }}
                        >
                          {item.label}
                        </Text>
                        <Text
                          style={{
                            fontFamily: 'Helvetica-Bold',
                            fontSize: 8,
                            color: item.color === C.cream ? C.black : item.color,
                          }}
                        >
                          {item.val}
                        </Text>
                      </View>
                      {item.color === C.cream ? (
                        <View
                          style={{
                            height: 6,
                            borderWidth: 1,
                            borderColor: C.black,
                            borderStyle: 'solid' as const,
                            width: '100%',
                          }}
                        >
                          <View
                            style={{
                              height: '100%',
                              backgroundColor: C.cream,
                              width: `${tT > 0 ? (item.val / tT) * 100 : 0}%`,
                            }}
                          />
                        </View>
                      ) : (
                        <Bar pct={tT > 0 ? (item.val / tT) * 100 : 0} color={item.color} />
                      )}
                    </View>
                  ))}
                </View>
              </ShadowBox>
            </View>

            {/* CARD 2: TASA DE COMPLETITUD */}
            <View style={{ width: '34%', paddingHorizontal: 3 }}>
              <ShadowBox bg={C.white}>
                <View style={{ padding: 10, alignItems: 'center' as const }}>
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 8,
                      color: C.black,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1.5,
                      marginBottom: 4,
                      alignSelf: 'flex-start' as const,
                      borderBottomWidth: 2,
                      borderBottomColor: C.black,
                      borderBottomStyle: 'solid' as const,
                      paddingBottom: 4,
                      width: '100%',
                    }}
                  >
                    TASA DE COMPLETITUD
                  </Text>

                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 48,
                      color: compColor,
                      textAlign: 'center' as const,
                      marginVertical: 4,
                    }}
                  >
                    {pctComp}
                    <Text style={{ fontSize: 22 }}>%</Text>
                  </Text>

                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 6,
                      color: C.grey,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1,
                      marginBottom: 6,
                    }}
                  >
                    DE TAREAS COMPLETADAS
                  </Text>

                  <Bar pct={pctComp} color={compColor} h={12} />
                </View>
              </ShadowBox>
            </View>

            {/* CARD 3: PRIORIDAD ACTIVA */}
            <View style={{ width: '33%', paddingLeft: 5 }}>
              <ShadowBox bg={C.white}>
                <View style={{ padding: 10 }}>
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 8,
                      color: C.black,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 1.5,
                      marginBottom: 10,
                      borderBottomWidth: 2,
                      borderBottomColor: C.black,
                      borderBottomStyle: 'solid' as const,
                      paddingBottom: 4,
                    }}
                  >
                    PRIORIDAD ACTIVA
                  </Text>

                  {[
                    { label: 'ALTA', val: pAlta, color: C.red },
                    { label: 'MEDIA', val: pMedia, color: C.orange },
                    { label: 'BAJA', val: pBaja, color: C.green },
                  ].map((item, i) => (
                    <View key={i} style={{ marginBottom: i < 2 ? 8 : 0 }}>
                      <View
                        style={{
                          flexDirection: 'row' as const,
                          alignItems: 'center' as const,
                          marginBottom: 3,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: item.color,
                            paddingHorizontal: 5,
                            paddingVertical: 2,
                            marginRight: 6,
                            borderWidth: 1,
                            borderColor: C.black,
                            borderStyle: 'solid' as const,
                          }}
                        >
                          <Text
                            style={{
                              fontFamily: 'Helvetica-Bold',
                              fontSize: 6,
                              color: C.white,
                              letterSpacing: 0.5,
                            }}
                          >
                            {item.label}
                          </Text>
                        </View>
                        <Text
                          style={{
                            fontFamily: 'Helvetica-Bold',
                            fontSize: 10,
                            color: item.color,
                          }}
                        >
                          {item.val}
                        </Text>
                      </View>
                      <Bar
                        pct={pTotal > 0 ? (item.val / pTotal) * 100 : 0}
                        color={item.color}
                      />
                    </View>
                  ))}
                </View>
              </ShadowBox>
            </View>
          </View>

          {/* ACTIVIDAD RECIENTE — matches the web's timeline items */}
          <View style={{ marginTop: 6 }}>
            <View
              style={{
                flexDirection: 'row' as const,
                alignItems: 'center' as const,
                marginBottom: 8,
                paddingBottom: 4,
                borderBottomWidth: 2,
                borderBottomColor: C.black,
                borderBottomStyle: 'solid' as const,
              }}
            >
              <View style={{ width: 4, height: 14, backgroundColor: C.black, marginRight: 8 }} />
              <Text
                style={{
                  fontFamily: 'Helvetica-Bold',
                  fontSize: 11,
                  color: C.black,
                  textTransform: 'uppercase' as const,
                  letterSpacing: 2,
                }}
              >
                ACTIVIDAD RECIENTE
              </Text>
            </View>

            <View
              style={{
                borderWidth: 2,
                borderColor: C.black,
                borderStyle: 'solid' as const,
              }}
            >
              {acts.slice(0, 5).map((a, i) => (
                <View
                  key={i}
                  style={{
                    flexDirection: 'row' as const,
                    alignItems: 'center' as const,
                    paddingVertical: 6,
                    paddingHorizontal: 8,
                    backgroundColor: i % 2 === 0 ? C.cream : C.white,
                    borderBottomWidth: i < acts.length - 1 ? 1 : 0,
                    borderBottomColor: 'rgba(26,26,26,0.1)',
                    borderBottomStyle: 'solid' as const,
                  }}
                >
                  {/* Dot */}
                  <View
                    style={{
                      width: 6,
                      height: 6,
                      backgroundColor: a.color,
                      marginRight: 6,
                      borderWidth: 1,
                      borderColor: C.black,
                      borderStyle: 'solid' as const,
                    }}
                  />
                  {/* Badge */}
                  <View
                    style={{
                      backgroundColor: a.color,
                      paddingHorizontal: 6,
                      paddingVertical: 2,
                      marginRight: 8,
                      borderWidth: 1,
                      borderColor: C.black,
                      borderStyle: 'solid' as const,
                    }}
                  >
                    <Text
                      style={{
                        fontFamily: 'Helvetica-Bold',
                        fontSize: 6,
                        color: a.color === C.black ? C.white : C.white,
                        letterSpacing: 0.5,
                      }}
                    >
                      {a.type}
                    </Text>
                  </View>
                  {/* Detail */}
                  <Text
                    style={{
                      fontFamily: 'Helvetica',
                      fontSize: 7,
                      color: C.black,
                      flex: 1,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 0.3,
                    }}
                  >
                    {trunc(a.detail, 55)}
                  </Text>
                  {/* Date */}
                  <Text
                    style={{
                      fontFamily: 'Helvetica-Bold',
                      fontSize: 6,
                      color: C.grey,
                      textTransform: 'uppercase' as const,
                      letterSpacing: 0.5,
                    }}
                  >
                    {a.date.toUpperCase()}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Page>

      {/* ════════════════════════════════════════════
          PÁGINA 3: VISITAS TÉCNICAS
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader section="VISITAS TÉCNICAS" date={dateStr.toUpperCase()} />
        <FixedFooter />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SectionTitle title="VISITAS TÉCNICAS" count={tV} color={C.blue} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <THead cols={vCols} color={C.blue} widths={vW} />
            {visitas.slice(0, MAX).map((v: any, i: number) => (
              <TRow
                key={i}
                alt={i % 2 === 0}
                widths={vW}
                cells={[
                  <Text style={ct}>{i + 1}</Text>,
                  <Text style={ct}>{trunc(v.origen, 24)}</Text>,
                  <Text style={ct}>{trunc(v.destino, 24)}</Text>,
                  <Text style={ct}>{up(v.fecha)}</Text>,
                  <Text style={ct}>{up(v.hora)}</Text>,
                  <Text style={ct}>{trunc(v.responsable, 22)}</Text>,
                ]}
              />
            ))}
          </View>
          {tV > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {tV} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════
          PÁGINA 4: TAREAS OPERATIVAS
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader section="TAREAS OPERATIVAS" date={dateStr.toUpperCase()} />
        <FixedFooter />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SectionTitle title="TAREAS OPERATIVAS" count={tT} color={C.green} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <THead cols={tCols} color={C.green} widths={tW} />
            {tareas.slice(0, MAX).map((t: any, i: number) => (
              <TRow
                key={i}
                alt={i % 2 === 0}
                widths={tW}
                cells={[
                  <Text style={ct}>{i + 1}</Text>,
                  <Text style={ct}>{trunc(t.title, 42)}</Text>,
                  <StatusCell status={t.status} />,
                  <PriorityCell priority={t.priority} />,
                  <Text style={ct}>{up(t.dueDate)}</Text>,
                ]}
              />
            ))}
          </View>
          {tT > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {tT} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════
          PÁGINA 5: NOVEDADES
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader section="NOVEDADES" date={dateStr.toUpperCase()} />
        <FixedFooter />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SectionTitle title="NOVEDADES" count={tN} color={C.black} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <THead cols={nCols} color={C.black} widths={nW} />
            {novedades.slice(0, MAX).map((n: any, i: number) => (
              <TRow
                key={i}
                alt={i % 2 === 0}
                widths={nW}
                cells={[
                  <Text style={ct}>{i + 1}</Text>,
                  <Text style={ct}>{trunc(n.title, 48)}</Text>,
                  <Text style={ct}>{up(n.fecha || formatDate(n.created_at || n.createdAt))}</Text>,
                  <Text style={ct}>{trunc(n.author_name || n.authorName, 22)}</Text>,
                ]}
              />
            ))}
          </View>
          {tN > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {tN} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════
          PÁGINA 6: DILIGENCIAMIENTOS
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader section="DILIGENCIAMIENTOS" date={dateStr.toUpperCase()} />
        <FixedFooter />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SectionTitle title="DILIGENCIAMIENTOS" count={tD} color={C.purple} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <THead cols={dCols} color={C.purple} widths={dW} />
            {diligenciamientos.slice(0, MAX).map((d: any, i: number) => (
              <TRow
                key={i}
                alt={i % 2 === 0}
                widths={dW}
                cells={[
                  <Text style={ct}>{i + 1}</Text>,
                  <Text style={ct}>{trunc(d.title, 48)}</Text>,
                  <Text style={ct}>{up(d.fecha || formatDate(d.created_at || d.createdAt))}</Text>,
                  <Text style={ct}>{trunc(d.author_name || d.authorName, 22)}</Text>,
                ]}
              />
            ))}
          </View>
          {tD > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {tD} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>

      {/* ════════════════════════════════════════════
          PÁGINA 7: PERSONAL ACTIVO
          ════════════════════════════════════════════ */}
      <Page size="A4" style={{ padding: 0, fontFamily: 'Helvetica', fontSize: 8 }}>
        <FixedHeader section="PERSONAL ACTIVO" date={dateStr.toUpperCase()} />
        <FixedFooter />
        <View style={{ paddingTop: 48, paddingHorizontal: 24, paddingBottom: 34 }}>
          <SectionTitle title="PERSONAL ACTIVO" count={tP} color={C.orange} />
          <View style={{ borderWidth: 2, borderColor: C.black, borderStyle: 'solid' as const }}>
            <THead cols={pCols} color={C.orange} widths={pW} />
            {personal.slice(0, MAX).map((p: any, i: number) => (
              <TRow
                key={i}
                alt={i % 2 === 0}
                widths={pW}
                cells={[
                  <Text style={ct}>{i + 1}</Text>,
                  <Text style={ct}>{trunc(p.name, 38)}</Text>,
                  <Text style={ct}>{trunc(p.role, 28)}</Text>,
                  <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: p.status === 'Activo' ? C.green : C.red,
                        marginRight: 4,
                        borderWidth: 1,
                        borderColor: C.black,
                        borderStyle: 'solid' as const,
                      }}
                    />
                    <Text
                      style={{
                        ...ctBold,
                        color: p.status === 'Activo' ? C.green : C.red,
                      }}
                    >
                      {up(p.status)}
                    </Text>
                  </View>,
                ]}
              />
            ))}
          </View>
          {tP > MAX && (
            <View style={{ paddingVertical: 6, backgroundColor: C.cream, borderWidth: 2, borderTopWidth: 0, borderColor: C.black, borderStyle: 'solid' as const }}>
              <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.grey, textAlign: 'center' as const, textTransform: 'uppercase' as const, letterSpacing: 1 }}>
                MOSTRANDO {MAX} DE {tP} REGISTROS
              </Text>
            </View>
          )}
        </View>
      </Page>
    </Document>
  );
}
