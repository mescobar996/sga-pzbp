import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

// ── Brand colors ──
const C = {
  black: '#1a1a1a',
  blue: '#0055ff',
  green: '#00cc66',
  red: '#e63b2e',
  orange: '#ff9900',
  purple: '#9b59b6',
  cream: '#f5f0e8',
  white: '#ffffff',
  grey: '#6b7280',
  lightGrey: '#e5e7eb',
};

const styles = StyleSheet.create({
  // Pages
  page: { padding: 20, fontFamily: 'Helvetica', fontSize: 8, color: C.black },
  coverPage: { padding: 0, backgroundColor: C.cream, justifyContent: 'flex-end' },

  // Cover
  coverContent: { padding: '50 30 30 30' },
  coverBadge: {
    fontSize: 8, fontWeight: 'bold', color: C.blue, letterSpacing: 1.5,
    textTransform: 'uppercase', marginBottom: 20,
    alignSelf: 'flex-start', backgroundColor: C.black,
    padding: '4 12',
  },
  coverTitle: { fontSize: 36, fontWeight: 'bold', color: C.black, lineHeight: 1.1, marginBottom: 8 },
  coverAccent: { color: C.blue },
  coverLine: { width: 60, height: 4, backgroundColor: C.black, marginVertical: 16 },
  coverSub: { fontSize: 10, color: C.grey, fontWeight: 'medium', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 30 },

  // KPI row
  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, backgroundColor: C.white, padding: 12,
    borderWidth: 2, borderColor: C.black, borderRadius: 4,
    alignItems: 'center',
  },
  statIcon: { fontSize: 18, marginBottom: 4 },
  statValue: { fontSize: 24, fontWeight: 'bold', color: C.black, fontFamily: 'Helvetica' },
  statLabel: { fontSize: 6, fontWeight: 'bold', color: C.grey, textTransform: 'uppercase', letterSpacing: 1, marginTop: 2 },

  // Cover footer
  coverFooter: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.white, padding: 14, borderWidth: 2, borderColor: C.black, borderRadius: 4,
  },
  coverFooterLabel: { fontSize: 6, fontWeight: 'bold', color: C.grey, textTransform: 'uppercase', letterSpacing: 1 },
  coverFooterValue: { fontSize: 10, fontWeight: 'bold', color: C.black },

  // Section
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, marginTop: 10 },
  sectionAccent: { width: 4, height: 20, backgroundColor: C.black, marginRight: 6 },
  sectionTitle: { fontSize: 13, fontWeight: 'bold', color: C.black, textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionCount: { marginLeft: 'auto', fontSize: 7, fontWeight: 'bold', color: C.grey },

  // Indicator cards
  indicatorRow: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  indicatorCard: {
    flex: 1, backgroundColor: C.white, padding: 10,
    borderWidth: 1, borderColor: C.black, borderRadius: 3,
  },
  indicatorTitle: { fontSize: 7, fontWeight: 'bold', color: C.grey, textTransform: 'uppercase', marginBottom: 4 },
  indicatorValue: { fontSize: 18, fontWeight: 'bold', color: C.black },
  indicatorBar: { height: 6, backgroundColor: C.lightGrey, borderRadius: 3, marginTop: 4 },

  // Timeline
  timelineItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: C.lightGrey },
  timelineDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  timelineType: { fontSize: 6, fontWeight: 'bold', color: C.white, padding: '1 4', borderRadius: 2, marginRight: 4 },
  timelineDetail: { fontSize: 8, fontWeight: 'normal', flex: 1, color: C.black },
  timelineDate: { fontSize: 6, color: C.grey, fontWeight: 'bold' },

  // Table headers
  tableHeader: { flexDirection: 'row', backgroundColor: C.black, padding: 5, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  tableHeaderCell: { flex: 1, color: C.white, fontSize: 6, fontWeight: 'bold', textTransform: 'uppercase' },
  tableRow: { flexDirection: 'row', padding: 5, borderBottomWidth: 0.5, borderBottomColor: C.lightGrey },
  tableRowAlt: { backgroundColor: C.cream },
  tableCell: { flex: 1, fontSize: 7, color: C.black },

  // Footer
  footer: {
    position: 'absolute', bottom: 15, left: 20, right: 20,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingTop: 6, borderTopWidth: 0.5, borderTopColor: C.lightGrey,
  },
  footerText: { fontSize: 6, color: C.grey, fontWeight: 'bold' },
  footerPage: { fontSize: 6, color: C.grey, fontWeight: 'bold' },

  // Priority badges
  badgeAlta: { color: C.red },
  badgeMedia: { color: C.blue },
  badgeBaja: { color: C.green },
});

const formatDate = (dateStr: string) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('es-ES');
  } catch { return dateStr; }
};

const PriorityCell = ({ priority }: { priority: string }) => {
  const color = priority === 'alta' ? C.red : priority === 'media' ? C.blue : C.green;
  return <Text style={{ ...styles.tableCell, color }}>{(priority || '—').toUpperCase()}</Text>;
};

const StatusCell = ({ status }: { status: string }) => {
  const map: Record<string, string> = { pendiente: 'Pendiente', en_proceso: 'En Proceso', completado: 'Completado' };
  const color = status === 'completado' ? C.green : status === 'en_proceso' ? C.blue : C.grey;
  return <Text style={{ ...styles.tableCell, color }}>{map[status] || status}</Text>;
};

const TableHeader = ({ cols }: { cols: string[] }) => (
  <View style={styles.tableHeader}>
    {cols.map((c, i) => <Text key={i} style={styles.tableHeaderCell}>{c}</Text>)}
  </View>
);

const TableRow = ({ cells, alt }: { cells: React.ReactNode[]; alt?: boolean }) => (
  <View style={[styles.tableRow, alt && styles.tableRowAlt]}>
    {cells.map((c, i) => <View key={i}>{c}</View>)}
  </View>
);

interface ReportPDFProps {
  data: Record<string, any[]>;
  now: string;
  dateStr: string;
}

export default function ReportPDF({ data, now, dateStr }: ReportPDFProps) {
  const totalVisitas = data.visitas?.length || 0;
  const totalTareas = data.tareas?.length || 0;
  const totalPersonal = data.personal?.length || 0;
  const totalNovedades = data.novedades?.length || 0;
  const totalDiligenciamientos = data.diligenciamientos?.length || 0;
  const totalRecords = totalVisitas + totalTareas + totalPersonal + totalNovedades + totalDiligenciamientos;

  const tareasPendientes = data.tareas?.filter((t: any) => t.status === 'pendiente').length || 0;
  const tareasEnProceso = data.tareas?.filter((t: any) => t.status === 'en_proceso').length || 0;
  const tareasCompletadas = data.tareas?.filter((t: any) => t.status === 'completado').length || 0;
  const tasaCompletitud = totalTareas > 0 ? Math.round((tareasCompletadas / totalTareas) * 100) : 0;

  const tareasAlta = data.tareas?.filter((t: any) => t.priority === 'alta' && t.status !== 'completado').length || 0;
  const tareasMedia = data.tareas?.filter((t: any) => t.priority === 'media' && t.status !== 'completado').length || 0;
  const tareasBaja = data.tareas?.filter((t: any) => t.priority === 'baja' && t.status !== 'completado').length || 0;

  const activities: { date: string; type: string; detail: string; color: string }[] = [];
  data.visitas?.slice(0, 3).forEach((v: any) => activities.push({ date: v.fecha || 'N/A', type: 'VISITA', detail: `${v.origen || 'N/A'} → ${v.destino || 'N/A'}`, color: C.green }));
  data.tareas?.slice(0, 3).forEach((t: any) => activities.push({ date: t.createdAt ? formatDate(t.createdAt) : 'N/A', type: 'TAREA', detail: t.title || 'Sin título', color: C.blue }));
  data.novedades?.slice(0, 2).forEach((n: any) => activities.push({ date: n.createdAt ? formatDate(n.createdAt) : 'N/A', type: 'NOVEDAD', detail: n.title || 'Sin título', color: C.purple }));
  activities.sort((a, b) => { if (a.date === 'N/A' || b.date === 'N/A') return 0; return new Date(b.date).getTime() - new Date(a.date).getTime(); });

  return (
    <Document>
      {/* ── COVER ── */}
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverContent}>
          <View style={styles.coverBadge}><Text>Sistema de Gestión de Actividades</Text></View>
          <Text style={styles.coverTitle}>REPORTE{'\n'}<Text style={styles.coverAccent}>COMPLETO</Text></Text>
          <View style={styles.coverLine} />
          <Text style={styles.coverSub}>Prefectura Naval Argentina — SGA PZBP</Text>

          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📍</Text>
              <Text style={styles.statValue}>{totalVisitas}</Text>
              <Text style={styles.statLabel}>Visitas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>✅</Text>
              <Text style={styles.statValue}>{totalTareas}</Text>
              <Text style={styles.statLabel}>Tareas</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>👥</Text>
              <Text style={styles.statValue}>{totalPersonal}</Text>
              <Text style={styles.statLabel}>Personal</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📰</Text>
              <Text style={styles.statValue}>{totalNovedades}</Text>
              <Text style={styles.statLabel}>Novedades</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statIcon}>📋</Text>
              <Text style={styles.statValue}>{totalDiligenciamientos}</Text>
              <Text style={styles.statLabel}>Diligencias</Text>
            </View>
          </View>

          <View style={styles.coverFooter}>
            <View>
              <Text style={styles.coverFooterLabel}>Total de registros</Text>
              <Text style={styles.coverFooterValue}>{totalRecords}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.coverFooterLabel}>Fecha de generación</Text>
              <Text style={styles.coverFooterValue}>{dateStr}</Text>
              <Text style={{ fontSize: 7, color: C.grey, marginTop: 2 }}>{now}</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ── INDICADORES ── */}
      <Page size="A4" style={styles.page}>
        <View style={styles.sectionHeader}>
          <View style={styles.sectionAccent} />
          <View>
            <Text style={styles.sectionTitle}>Indicadores Clave</Text>
            <Text style={{ fontSize: 7, color: C.grey, marginTop: 1 }}>Resumen general del sistema</Text>
          </View>
        </View>

        <View style={styles.indicatorRow}>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorTitle}>Estado de Tareas</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.blue }}>{tareasPendientes}</Text>
                <Text style={{ fontSize: 5, color: C.grey, fontWeight: 'bold', textTransform: 'uppercase' }}>Pendientes</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.orange }}>{tareasEnProceso}</Text>
                <Text style={{ fontSize: 5, color: C.grey, fontWeight: 'bold', textTransform: 'uppercase' }}>En Proceso</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.green }}>{tareasCompletadas}</Text>
                <Text style={{ fontSize: 5, color: C.grey, fontWeight: 'bold', textTransform: 'uppercase' }}>Completadas</Text>
              </View>
            </View>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorTitle}>Tasa de Completitud</Text>
            <Text style={{ fontSize: 28, fontWeight: 'bold', color: C.green, textAlign: 'center' }}>{tasaCompletitud}%</Text>
            <View style={styles.indicatorBar}>
              <View style={{ width: `${tasaCompletitud}%`, height: '100%', backgroundColor: C.green, borderRadius: 3 }} />
            </View>
          </View>
        </View>

        <View style={styles.indicatorRow}>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorTitle}>Prioridad Activa</Text>
            <View style={{ flexDirection: 'row', gap: 6, marginTop: 4 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.red }}>{tareasAlta}</Text>
                <Text style={{ fontSize: 5, color: C.grey, fontWeight: 'bold', textTransform: 'uppercase' }}>Alta</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.blue }}>{tareasMedia}</Text>
                <Text style={{ fontSize: 5, color: C.grey, fontWeight: 'bold', textTransform: 'uppercase' }}>Media</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: C.green }}>{tareasBaja}</Text>
                <Text style={{ fontSize: 5, color: C.grey, fontWeight: 'bold', textTransform: 'uppercase' }}>Baja</Text>
              </View>
            </View>
          </View>
          <View style={styles.indicatorCard}>
            <Text style={styles.indicatorTitle}>Actividad Reciente</Text>
            {activities.slice(0, 4).map((a, i) => (
              <View key={i} style={styles.timelineItem}>
                <View style={[{ backgroundColor: a.color, width: 6, height: 6, borderRadius: 3, marginRight: 4 }]} />
                <View style={[{ backgroundColor: a.color }, { padding: '1 3', borderRadius: 1 }]}>
                  <Text style={{ fontSize: 5, color: C.white, fontWeight: 'bold' }}>{a.type}</Text>
                </View>
                <Text style={[styles.timelineDetail, { fontSize: 6 }]}>{a.detail}</Text>
                <Text style={[styles.timelineDate, { fontSize: 5 }]}>{a.date}</Text>
              </View>
            ))}
          </View>
        </View>

        <Text style={styles.footerText}>SGA PZBP — Prefectura Naval Argentina</Text>
        <Text style={styles.footerPage}>Página 2</Text>
      </Page>

      {/* ── VISITAS ── */}
      {totalVisitas > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: C.blue }]} />
            <Text style={styles.sectionTitle}>Visitas Técnicas</Text>
            <Text style={styles.sectionCount}>{totalVisitas} registros</Text>
          </View>
          <TableHeader cols={['#', 'Origen', 'Destino', 'Fecha', 'Hora', 'Responsable']} />
          {data.visitas.map((v: any, i: number) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              <Text style={styles.tableCell}>{i + 1}</Text>,
              <Text style={styles.tableCell}>{v.origen || '—'}</Text>,
              <Text style={styles.tableCell}>{v.destino || '—'}</Text>,
              <Text style={styles.tableCell}>{v.fecha || '—'}</Text>,
              <Text style={styles.tableCell}>{v.hora || '—'}</Text>,
              <Text style={styles.tableCell}>{v.responsable || '—'}</Text>,
            ]} />
          ))}
          <Text style={styles.footerText}>SGA PZBP — Prefectura Naval Argentina</Text>
          <Text style={styles.footerPage}>Página 3</Text>
        </Page>
      )}

      {/* ── TAREAS ── */}
      {totalTareas > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: C.green }]} />
            <Text style={styles.sectionTitle}>Tareas</Text>
            <Text style={styles.sectionCount}>{totalTareas} registros</Text>
          </View>
          <TableHeader cols={['#', 'Título', 'Estado', 'Prioridad', 'Vencimiento']} />
          {data.tareas.map((t: any, i: number) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              <Text style={styles.tableCell}>{i + 1}</Text>,
              <Text style={styles.tableCell}>{t.title || '—'}</Text>,
              <StatusCell status={t.status} />,
              <PriorityCell priority={t.priority} />,
              <Text style={styles.tableCell}>{t.dueDate || '—'}</Text>,
            ]} />
          ))}
          <Text style={styles.footerText}>SGA PZBP — Prefectura Naval Argentina</Text>
          <Text style={styles.footerPage}>Página 4</Text>
        </Page>
      )}

      {/* ── NOVEDADES ── */}
      {totalNovedades > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: C.purple }]} />
            <Text style={styles.sectionTitle}>Novedades</Text>
            <Text style={styles.sectionCount}>{totalNovedades} registros</Text>
          </View>
          <TableHeader cols={['#', 'Título', 'Fecha', 'Autor']} />
          {data.novedades.map((n: any, i: number) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              <Text style={styles.tableCell}>{i + 1}</Text>,
              <Text style={styles.tableCell}>{n.title || '—'}</Text>,
              <Text style={styles.tableCell}>{n.fecha || formatDate(n.created_at)}</Text>,
              <Text style={styles.tableCell}>{n.author_name || n.authorName || '—'}</Text>,
            ]} />
          ))}
          <Text style={styles.footerText}>SGA PZBP — Prefectura Naval Argentina</Text>
          <Text style={styles.footerPage}>Página 5</Text>
        </Page>
      )}

      {/* ── DILIGENCIAMIENTOS ── */}
      {totalDiligenciamientos > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: C.orange }]} />
            <Text style={styles.sectionTitle}>Diligenciamientos</Text>
            <Text style={styles.sectionCount}>{totalDiligenciamientos} registros</Text>
          </View>
          <TableHeader cols={['#', 'Título', 'Fecha', 'Autor']} />
          {data.diligenciamientos.map((d: any, i: number) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              <Text style={styles.tableCell}>{i + 1}</Text>,
              <Text style={styles.tableCell}>{d.title || '—'}</Text>,
              <Text style={styles.tableCell}>{d.fecha || formatDate(d.created_at)}</Text>,
              <Text style={styles.tableCell}>{d.author_name || d.authorName || '—'}</Text>,
            ]} />
          ))}
          <Text style={styles.footerText}>SGA PZBP — Prefectura Naval Argentina</Text>
          <Text style={styles.footerPage}>Página 6</Text>
        </Page>
      )}

      {/* ── PERSONAL ── */}
      {totalPersonal > 0 && (
        <Page size="A4" style={styles.page}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionAccent, { backgroundColor: C.orange }]} />
            <Text style={styles.sectionTitle}>Personal</Text>
            <Text style={styles.sectionCount}>{totalPersonal} registros</Text>
          </View>
          <TableHeader cols={['#', 'Nombre', 'Rol', 'Estado']} />
          {data.personal.map((p: any, i: number) => (
            <TableRow key={i} alt={i % 2 === 1} cells={[
              <Text style={styles.tableCell}>{i + 1}</Text>,
              <Text style={styles.tableCell}>{p.name || '—'}</Text>,
              <Text style={styles.tableCell}>{p.role || '—'}</Text>,
              <Text style={{ ...styles.tableCell, color: p.status === 'Activo' ? C.green : C.red }}>{p.status || '—'}</Text>,
            ]} />
          ))}
          <Text style={styles.footerText}>SGA PZBP — Prefectura Naval Argentina</Text>
          <Text style={styles.footerPage}>Página 7</Text>
        </Page>
      )}
    </Document>
  );
}
