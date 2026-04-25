import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet, Font } from '@react-pdf/renderer';

// ═══════════════════════════════════════════════════════════════
// PREMIUM EDITORIAL DESIGN SYSTEM — SGA REVISIÓN 2026
// ═══════════════════════════════════════════════════════════════
const COLORS = {
  navy:      '#0A1628', // Azul Profundo PNA
  gold:      '#B08D57', // Dorado Premium Acento
  cream:     '#FDFCF8', // Fondo Papel Revista
  slate:     '#1E293B', // Texto Principal
  gray:      '#64748B', // Texto Secundario
  divider:   '#E2E8F0',
  white:     '#FFFFFF',
  accent:    '#1B4FD8', // Azul Eléctrico
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
    paddingTop: 60,
    paddingBottom: 40,
  },
  
  // ─── COVER (REVISTA) ────────────────────────────────────────
  cover: {
    height: '100%',
    backgroundColor: COLORS.navy,
    position: 'relative',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 80,
  },
  coverHeader: {
    alignItems: 'center',
  },
  logo: {
    width: 100,
    marginBottom: 30,
  },
  magazineTitle: {
    fontSize: 60,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: 2,
    lineHeight: 1,
  },
  magazineSubtitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gold,
    letterSpacing: 10,
    marginTop: 20,
    textTransform: 'uppercase',
  },
  coverFooter: {
    width: '100%',
    paddingHorizontal: 40,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    paddingTop: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  coverDate: {
    color: COLORS.white,
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
  },
  issueNumber: {
    color: COLORS.gold,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
  },

  // ─── EDITORIAL SECTIONS ─────────────────────────────────────
  sectionHeader: {
    marginBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gold,
    paddingBottom: 10,
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate,
    letterSpacing: -0.5,
  },
  sectionDivider: {
    height: 2,
    width: 40,
    backgroundColor: COLORS.gold,
    marginTop: 5,
  },

  // ─── ARTICLE LAYOUT ─────────────────────────────────────────
  articleRow: {
    flexDirection: 'row',
    gap: 15,
    marginBottom: 20,
  },
  articleCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.navy,
  },
  articleTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate,
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  articleContent: {
    fontSize: 8,
    lineHeight: 1.4,
    color: COLORS.gray,
    textAlign: 'justify',
  },
  articleMeta: {
    marginTop: 6,
    fontSize: 6,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gold,
    textTransform: 'uppercase',
  },

  // ─── DATA GRID ──────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 15,
  },
  statBox: {
    width: '18%',
    backgroundColor: COLORS.navy,
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 6,
    color: COLORS.gold,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ─── TABLES ─────────────────────────────────────────────────
  table: {
    display: 'flex',
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    marginTop: 10,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
    minHeight: 25,
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
    padding: 5,
    fontSize: 7,
    color: COLORS.slate,
  },

  // ─── FOOTER/HEADER ──────────────────────────────────────────
  pageFolio: {
    position: 'absolute',
    bottom: 20,
    right: 40,
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gray,
  },
  pageLogoSmall: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    fontSize: 6,
    color: COLORS.gray,
    letterSpacing: 1,
  }
});

// ─── COMPONENTS ───────────────────────────────────────────────

const Article = ({ title, content, meta, color = COLORS.navy }: any) => (
  <View style={[S.articleCard, { borderLeftColor: color }]}>
    <Text style={S.articleTitle}>{title?.toUpperCase()}</Text>
    <Text style={S.articleContent}>{content?.toUpperCase()}</Text>
    <Text style={S.articleMeta}>{meta?.toUpperCase()}</Text>
  </View>
);

const SectionHeading = ({ category, title }: any) => (
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
          PÁGINA 1: PORTADA TIPO REVISTA
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.cover}>
          <View style={S.coverHeader}>
            <Image src="/logo-pna.png" style={S.logo} />
            <Text style={S.magazineTitle}>S G A</Text>
            <Text style={[S.magazineTitle, { color: COLORS.gold, fontSize: 40, marginTop: 10 }]}>P Z B P</Text>
            <Text style={S.magazineSubtitle}>R E S U M E N  O P E R A T I V O</Text>
          </View>

          <View style={{ width: '100%', alignItems: 'center' }}>
            <View style={{ width: 80, height: 1, backgroundColor: COLORS.gold, marginBottom: 15 }} />
            <Text style={{ color: COLORS.white, fontSize: 9, letterSpacing: 5 }}>EDICIÓN PROFESIONAL</Text>
          </View>

          <View style={S.coverFooter}>
            <View>
              <Text style={S.coverDate}>{dateStr.toUpperCase()}</Text>
              <Text style={S.issueNumber}>GESTIÓN OPERATIVA</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: COLORS.white, fontSize: 24, fontFamily: 'Helvetica-Bold' }}>{total}</Text>
              <Text style={{ color: COLORS.gold, fontSize: 7 }}>REGISTROS TOTALES</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 2: RESUMEN Y ESTADÍSTICAS
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.contentWrapper}>
          <SectionHeading category="EDITORIAL" title="VISIÓN GENERAL DE OPERACIONES" />
          
          <Text style={[S.articleContent, { fontSize: 10, marginBottom: 20, color: COLORS.slate, textAlign: 'left', textTransform: 'uppercase' }]}>
            ESTE INFORME CONSOLIDA LA ACTIVIDAD OPERATIVA DE LA PREFECTURA DE ZONA BAJO PARANÁ. 
            SE PRESENTA UN ANÁLISIS DETALLADO DE VISITAS, TAREAS, PERSONAL Y NOVEDADES REGISTRADAS.
          </Text>

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
            <SectionHeading category="ESTADO DE FUERZA" title="PERSONAL Y RECURSOS" />
            <View style={S.articleRow}>
              <Article 
                title="DESPLIEGUE" 
                content={`SE CUENTA CON ${personal.length} EFECTIVOS ACTIVOS ASIGNADOS A DIVERSAS TAREAS OPERATIVAS Y ADMINISTRATIVAS.`}
                meta="PERSONAL"
              />
              <Article 
                title="GESTIÓN" 
                content={`SE HAN PROCESADO ${diligenciamientos.length} DILIGENCIAMIENTOS, MANTENIENDO LA EFICIENCIA EN LOS PROCESOS INTERNOS.`}
                meta="ADMINISTRACIÓN"
                color={COLORS.gold}
              />
            </View>
          </View>
        </View>
        
        <Text style={S.pageLogoSmall}>SGA PZBP | {now.toUpperCase()}</Text>
        <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA: TAREAS OPERATIVAS
          ═══════════════════════════════════════════════════════ */}
      {tareas.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeading category="OPERACIONES" title="LISTADO DE TAREAS OPERATIVAS" />
            
            <View style={S.table}>
              <View style={[S.tableRow, S.tableHeader]}>
                <Text style={[S.tableCell, { width: '40%' }]}>TÍTULO</Text>
                <Text style={[S.tableCell, { width: '20%' }]}>PRIORIDAD</Text>
                <Text style={[S.tableCell, { width: '20%' }]}>ESTADO</Text>
                <Text style={[S.tableCell, { width: '20%' }]}>VENCIMIENTO</Text>
              </View>
              {tareas.map((t: any, i: number) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { width: '40%', fontFamily: 'Helvetica-Bold' }]}>{t.title?.toUpperCase()}</Text>
                  <Text style={[S.tableCell, { width: '20%' }]}>{t.priority?.toUpperCase()}</Text>
                  <Text style={[S.tableCell, { width: '20%' }]}>{t.status?.toUpperCase()}</Text>
                  <Text style={[S.tableCell, { width: '20%' }]}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString().toUpperCase() : '—'}</Text>
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
            <SectionHeading category="REGISTRO" title="BITÁCORA DE VISITAS TÉCNICAS" />
            
            <View style={{ gap: 10, marginTop: 10 }}>
              {visitas.map((v: any, i: number) => (
                <View key={i} style={{ backgroundColor: COLORS.white, padding: 10, borderLeftWidth: 2, borderLeftColor: COLORS.gold, marginBottom: 5 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                    <Text style={{ fontSize: 7, color: COLORS.gray }}>{v.fecha?.toUpperCase()} | {v.hora?.toUpperCase()}</Text>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: COLORS.accent }}>{v.responsable?.toUpperCase()}</Text>
                  </View>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>{v.origen?.toUpperCase()} → {v.destino?.toUpperCase()}</Text>
                  {v.observaciones && (
                    <Text style={{ fontSize: 7, color: COLORS.slate, marginTop: 3, textTransform: 'uppercase' }}>{v.observaciones.toUpperCase()}</Text>
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
            <SectionHeading category="CRÓNICAS" title="NOVEDADES DE LA JORNADA" />
            
            <View style={{ gap: 15, marginTop: 10 }}>
              {novedades.map((n: any, i: number) => (
                <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 10 }}>
                  <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: COLORS.navy, marginBottom: 2 }}>
                    {n.title?.toUpperCase() || 'SIN TÍTULO'}
                  </Text>
                  <Text style={[S.articleContent, { textAlign: 'left', fontSize: 8, textTransform: 'uppercase' }]}>
                    {n.content?.toUpperCase()}
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 5 }}>
                    <Text style={{ fontSize: 6, color: COLORS.accent, fontFamily: 'Helvetica-Bold' }}>POR: {n.authorName?.toUpperCase() || 'SISTEMA'}</Text>
                    <Text style={{ fontSize: 6, color: COLORS.gray }}>{new Date(n.created_at || n.createdAt).toLocaleString().toUpperCase()}</Text>
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
            <SectionHeading category="ADMINISTRACIÓN" title="DILIGENCIAMIENTOS" />
            
            <View style={{ gap: 10, marginTop: 10 }}>
              {diligenciamientos.map((d: any, i: number) => (
                <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 8 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>{d.title?.toUpperCase()}</Text>
                    <Text style={{ fontSize: 7, color: COLORS.gray }}>{new Date(d.created_at || d.fecha).toLocaleDateString().toUpperCase()}</Text>
                  </View>
                  <Text style={[S.articleContent, { textAlign: 'left', fontSize: 8, textTransform: 'uppercase' }]}>
                    {d.content?.toUpperCase()}
                  </Text>
                  <Text style={{ fontSize: 6, color: COLORS.gold, marginTop: 4 }}>AUTOR: {d.authorName?.toUpperCase() || 'SISTEMA'}</Text>
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
            <SectionHeading category="FUERZA" title="PERSONAL OPERATIVO" />
            
            <View style={S.table}>
              <View style={[S.tableRow, S.tableHeader]}>
                <Text style={[S.tableCell, { width: '60%' }]}>NOMBRE</Text>
                <Text style={[S.tableCell, { width: '20%' }]}>ROL</Text>
                <Text style={[S.tableCell, { width: '20%' }]}>ESTADO</Text>
              </View>
              {personal.map((p: any, i: number) => (
                <View key={i} style={S.tableRow}>
                  <Text style={[S.tableCell, { width: '60%', fontFamily: 'Helvetica-Bold' }]}>{p.name?.toUpperCase()}</Text>
                  <Text style={[S.tableCell, { width: '20%' }]}>{p.role?.toUpperCase()}</Text>
                  <Text style={[S.tableCell, { width: '20%' }]}>{p.status?.toUpperCase()}</Text>
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
