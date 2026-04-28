import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════════════════════
// PREMIUM OPERATIONAL DESIGN SYSTEM — SGA 2026
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  navy:      '#0A1628', // AZUL PROFUNDO PNA
  gold:      '#B08D57', // DORADO PREMIUM ACENTO
  cream:     '#FDFCF8', // FONDO PAPEL REVISTA
  slate:     '#1E293B', // TEXTO PRINCIPAL
  gray:      '#64748B', // TEXTO SECUNDARIO
  divider:   '#E2E8F0',
  white:     '#FFFFFF',
  accent:    '#1B4FD8', // AZUL ELÉCTRICO
  success:   '#10B981', // VERDE COMPLETADO
  warning:   '#F59E0B', // AMARILLO EN PROCESO
  error:     '#EF4444', // ROJO PENDIENTE/VENCIDO
};

const S = StyleSheet.create({
  // ─── GENERAL ────────────────────────────────────────────────
  page: {
    padding: 0,
    backgroundColor: COLORS.cream,
    fontFamily: 'Helvetica',
  },
  contentWrapper: {
    paddingHorizontal: 40,
    paddingTop: 50,
    paddingBottom: 40,
  },
  
  // ─── COVER ──────────────────────────────────────────────────
  cover: {
    height: '100%',
    backgroundColor: COLORS.navy,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  logo: {
    width: 100,
    marginBottom: 40,
  },
  magazineTitle: {
    fontSize: 50,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: 4,
    lineHeight: 1,
  },
  magazineSubtitle: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gold,
    letterSpacing: 12,
    marginTop: 25,
    textTransform: 'uppercase',
  },
  coverDate: {
    color: COLORS.white,
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    marginTop: 40,
    letterSpacing: 2,
  },
  coverRecords: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  totalCount: {
    color: COLORS.white,
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
  },
  totalLabel: {
    color: COLORS.gold,
    fontSize: 8,
    letterSpacing: 2,
    marginTop: 5,
  },

  // ─── SECTIONS ───────────────────────────────────────────────
  sectionHeader: {
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.gold,
    paddingBottom: 8,
  },
  categoryLabel: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate,
    letterSpacing: -0.5,
  },

  // ─── DATA GRID / CARDS ──────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 15,
    marginVertical: 30,
    justifyContent: 'center',
  },
  statBox: {
    width: 80,
    height: 80,
    backgroundColor: COLORS.navy,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
    borderBottomWidth: 3,
    borderBottomColor: COLORS.gold,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 6,
    color: COLORS.gold,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
    fontFamily: 'Helvetica-Bold',
  },

  // ─── TABLES ─────────────────────────────────────────────────
  table: {
    display: 'flex',
    width: 'auto',
    marginTop: 10,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    minHeight: 30,
    alignItems: 'center',
  },
  tableHeader: {
    backgroundColor: COLORS.navy,
    color: COLORS.white,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    textTransform: 'uppercase',
  },
  tableCell: {
    padding: 6,
    fontSize: 7,
    color: COLORS.slate,
  },

  // ─── BADGES ─────────────────────────────────────────────────
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    textTransform: 'uppercase',
    textAlign: 'center',
    width: 70,
  },
  badgeSuccess: { backgroundColor: COLORS.success },
  badgeWarning: { backgroundColor: COLORS.warning },
  badgeError:   { backgroundColor: COLORS.error },
  badgeInfo:    { backgroundColor: COLORS.accent },

  // ─── CARD LISTING ───────────────────────────────────────────
  card: {
    backgroundColor: COLORS.white,
    padding: 12,
    borderLeftWidth: 4,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
  },
  cardTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.navy,
    marginBottom: 4,
  },
  cardMeta: {
    fontSize: 7,
    color: COLORS.gray,
    marginBottom: 6,
  },
  cardContent: {
    fontSize: 8,
    lineHeight: 1.4,
    color: COLORS.slate,
    textAlign: 'justify',
  },

  // ─── FOOTER ─────────────────────────────────────────────────
  pageFolio: {
    position: 'absolute',
    bottom: 25,
    right: 40,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gray,
  },
  pageLogoSmall: {
    position: 'absolute',
    bottom: 25,
    left: 40,
    fontSize: 7,
    color: COLORS.gray,
    letterSpacing: 1,
    fontFamily: 'Helvetica-Bold',
  }
});

// ─── HELPER COMPONENTS ───────────────────────────────────────

const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toLowerCase() || '';
  let style = S.badgeInfo;
  if (s.includes('completado') || s.includes('activo') || s.includes('operativo')) style = S.badgeSuccess;
  if (s.includes('pendiente') || s.includes('proceso') || s.includes('mantenimiento')) style = S.badgeError;
  if (s.includes('urgente') || s.includes('alta')) style = S.badgeError;
  
  return <Text style={[S.badge, style]}>{status?.toUpperCase() || 'S/E'}</Text>;
};

const SectionHeader = ({ category, title }: any) => (
  <View style={S.sectionHeader}>
    <Text style={S.categoryLabel}>{category?.toUpperCase()}</Text>
    <Text style={S.sectionTitle}>{title?.toUpperCase()}</Text>
  </View>
);

interface Props {
  data: any;
  now: string;
  dateStr: string;
}

export default function ReportPDF({ data, now, dateStr }: Props) {
  const { visitas = [], tareas = [], novedades = [], diligenciamientos = [], personal = [] } = data;
  const total = visitas.length + tareas.length + novedades.length + diligenciamientos.length + personal.length;

  return (
    <Document title={`SGA REPORT - ${dateStr.toUpperCase()}`}>
      {/* ═══════════════════════════════════════════════════════
          PÁGINA 1: PORTADA
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.cover}>
          <Image src="/logo-pna.png" style={S.logo} />
          <Text style={S.magazineTitle}>S G A</Text>
          <Text style={[S.magazineTitle, { color: COLORS.gold, fontSize: 35, marginTop: 15 }]}>P Z B P</Text>
          <Text style={S.coverDate}>{dateStr.toUpperCase()}</Text>
          
          <View style={S.coverRecords}>
            <Text style={S.totalCount}>{total}</Text>
            <Text style={S.totalLabel}>REGISTROS TOTALES</Text>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 2: RESUMEN DE INDICADORES
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.contentWrapper}>
          <SectionHeader category="INTELIGENCIA OPERATIVA" title="ESTADÍSTICAS GENERALES" />
          
          <View style={S.statsGrid}>
            <View style={S.statBox}>
              <Text style={S.statValue}>{visitas.length}</Text>
              <Text style={S.statLabel}>VISITAS</Text>
            </View>
            <View style={[S.statBox, { backgroundColor: COLORS.accent }]}>
              <Text style={S.statValue}>{tareas.length}</Text>
              <Text style={S.statLabel}>TAREAS</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statValue}>{novedades.length}</Text>
              <Text style={S.statLabel}>NOVEDADES</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statValue}>{personal.length}</Text>
              <Text style={S.statLabel}>PERSONAL</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statValue}>{diligenciamientos.length}</Text>
              <Text style={S.statLabel}>DILIGENCIAS</Text>
            </View>
          </View>

          <View style={{ marginTop: 30 }}>
            <SectionHeader category="ANÁLISIS DE FUERZA" title="RECURSOS Y GESTIÓN" />
            <View style={{ flexDirection: 'row', gap: 15 }}>
              <View style={[S.card, { flex: 1, borderLeftColor: COLORS.navy }]}>
                <Text style={S.cardTitle}>PERSONAL ACTIVO</Text>
                <Text style={S.cardContent}>
                  EL DESPLIEGUE ACTUAL CUENTA CON {personal.length} EFECTIVOS EN ESTADO OPERATIVO, 
                  GARANTIZANDO LA COBERTURA DE SEGURIDAD EN LA ZONA BAJO PARANÁ.
                </Text>
              </View>
              <View style={[S.card, { flex: 1, borderLeftColor: COLORS.gold }]}>
                <Text style={S.cardTitle}>DILIGENCIAS ADMINISTRATIVAS</Text>
                <Text style={S.cardContent}>
                  SE HAN TRAMITADO {diligenciamientos.length} DOCUMENTOS ADMINISTRATIVOS, 
                  CUMPLIENDO CON LOS PROTOCOLES DE GESTIÓN INTERNA.
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
        <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA: TAREAS OPERATIVAS (CON COLORES)
          ═══════════════════════════════════════════════════════ */}
      {tareas.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeader category="OPERACIONES" title="LISTADO DE TAREAS" />
            
            <View style={S.table}>
              <View style={[S.tableRow, S.tableHeader]}>
                <Text style={[S.tableCell, { width: '45%' }]}>TÍTULO DE LA TAREA</Text>
                <Text style={[S.tableCell, { width: '15%', textAlign: 'center' }]}>PRIORIDAD</Text>
                <Text style={[S.tableCell, { width: '20%', textAlign: 'center' }]}>ESTADO</Text>
                <Text style={[S.tableCell, { width: '20%', textAlign: 'right' }]}>FECHA LÍMITE</Text>
              </View>
              {tareas.map((t: any, i: number) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { width: '45%', fontFamily: 'Helvetica-Bold' }]}>{t.title?.toUpperCase()}</Text>
                  <View style={{ width: '15%', alignItems: 'center' }}>
                    <StatusBadge status={t.priority} />
                  </View>
                  <View style={{ width: '20%', alignItems: 'center' }}>
                    <StatusBadge status={t.status} />
                  </View>
                  <Text style={[S.tableCell, { width: '20%', textAlign: 'right', color: COLORS.gray }]}>
                    {t.dueDate ? new Date(t.dueDate).toLocaleDateString().toUpperCase() : '—'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════
          PÁGINA: VISITAS TÉCNICAS
          ═══════════════════════════════════════════════════════ */}
      {visitas.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeader category="REGISTRO" title="BITÁCORA DE VISITAS TÉCNICAS" />
            
            <View style={{ marginTop: 10 }}>
              {visitas.map((v: any, i: number) => (
                <View key={i} style={[S.card, { borderLeftColor: COLORS.gold }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.accent }}>
                      {v.fecha?.toUpperCase()} | {v.hora?.toUpperCase()}
                    </Text>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>
                      RESPONSABLE: {v.responsable?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.slate, marginBottom: 4 }}>
                    {v.origen?.toUpperCase()} → {v.destino?.toUpperCase()}
                  </Text>
                  {v.observaciones && (
                    <Text style={[S.cardContent, { color: COLORS.gray }]}>
                      OBSERVACIONES: {v.observaciones.toUpperCase()}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════
          PÁGINA: NOVEDADES
          ═══════════════════════════════════════════════════════ */}
      {novedades.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeader category="CRÓNICAS" title="NOVEDADES OPERATIVAS" />
            
            <View style={{ marginTop: 10 }}>
              {novedades.map((n: any, i: number) => (
                <View key={i} style={[S.card, { borderLeftColor: COLORS.navy, paddingVertical: 15 }]}>
                  <Text style={S.cardTitle}>{n.title?.toUpperCase() || 'SIN TÍTULO'}</Text>
                  <Text style={[S.cardContent, { marginBottom: 10 }]}>{n.content?.toUpperCase()}</Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: COLORS.divider, paddingTop: 6 }}>
                    <Text style={{ fontSize: 6, color: COLORS.accent, fontFamily: 'Helvetica-Bold' }}>
                      AUTOR: {n.authorName?.toUpperCase() || 'SISTEMA'}
                    </Text>
                    <Text style={{ fontSize: 6, color: COLORS.gray }}>
                      {new Date(n.created_at || n.createdAt).toLocaleString().toUpperCase()}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════
          PÁGINA: DILIGENCIAMIENTOS
          ═══════════════════════════════════════════════════════ */}
      {diligenciamientos.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeader category="ADMINISTRACIÓN" title="REGISTRO DE DILIGENCIAS" />
            
            <View style={{ marginTop: 10 }}>
              {diligenciamientos.map((d: any, i: number) => (
                <View key={i} style={[S.card, { borderLeftColor: COLORS.gold }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                    <View style={{ flexDirection: 'column' }}>
                      <Text style={S.cardTitle}>{d.title?.toUpperCase()}</Text>
                      {d.category && (
                        <Text style={{ fontSize: 6, fontFamily: 'Helvetica-Bold', color: COLORS.accent, marginTop: 2 }}>
                          MÓDULO: {d.category.toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 7, color: COLORS.gray }}>
                      {new Date(d.created_at || d.fecha).toLocaleDateString('es-ES').toUpperCase()}
                    </Text>
                  </View>
                  <Text style={S.cardContent}>{d.content?.toUpperCase()}</Text>
                  <Text style={{ fontSize: 6, color: COLORS.gold, marginTop: 6, fontFamily: 'Helvetica-Bold' }}>
                    AUTOR: {d.authorName?.toUpperCase() || 'SISTEMA'}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════
          PÁGINA: PERSONAL
          ═══════════════════════════════════════════════════════ */}
      {personal.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeader category="FUERZA" title="LISTADO DE PERSONAL" />
            
            <View style={S.table}>
              <View style={[S.tableRow, S.tableHeader]}>
                <Text style={[S.tableCell, { width: '50%' }]}>APELLIDO Y NOMBRE</Text>
                <Text style={[S.tableCell, { width: '25%', textAlign: 'center' }]}>ROL / CARGO</Text>
                <Text style={[S.tableCell, { width: '25%', textAlign: 'center' }]}>ESTADO</Text>
              </View>
              {personal.map((p: any, i: number) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { width: '50%', fontFamily: 'Helvetica-Bold' }]}>{p.name?.toUpperCase()}</Text>
                  <Text style={[S.tableCell, { width: '25%', textAlign: 'center' }]}>{p.role?.toUpperCase()}</Text>
                  <View style={{ width: '25%', alignItems: 'center' }}>
                    <StatusBadge status={p.status} />
                  </View>
                </View>
              ))}
            </View>
          </View>
          <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}

    </Document>
  );
}
