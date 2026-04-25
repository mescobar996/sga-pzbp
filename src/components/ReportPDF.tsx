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
    paddingVertical: 60,
  },
  coverHeader: {
    alignItems: 'center',
  },
  logo: {
    width: 120,
    marginBottom: 20,
  },
  magazineTitle: {
    fontSize: 90,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
    letterSpacing: -4,
    lineHeight: 0.8,
  },
  magazineSubtitle: {
    fontSize: 12,
    fontFamily: 'Helvetica',
    color: COLORS.gold,
    letterSpacing: 8,
    marginTop: 10,
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
    marginBottom: 30,
  },
  categoryLabel: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 32,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate,
    letterSpacing: -1,
  },
  sectionDivider: {
    height: 3,
    width: 60,
    backgroundColor: COLORS.gold,
    marginTop: 10,
  },

  // ─── ARTICLE LAYOUT ─────────────────────────────────────────
  articleRow: {
    flexDirection: 'row',
    gap: 20,
    marginBottom: 25,
  },
  articleCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: 15,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.navy,
  },
  articleTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.slate,
    marginBottom: 5,
    textTransform: 'uppercase',
  },
  articleContent: {
    fontSize: 9,
    lineHeight: 1.4,
    color: COLORS.gray,
    textAlign: 'justify',
  },
  articleMeta: {
    marginTop: 8,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gold,
    textTransform: 'uppercase',
  },

  // ─── DATA GRID ──────────────────────────────────────────────
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginVertical: 20,
  },
  statBox: {
    width: '31%',
    backgroundColor: COLORS.navy,
    padding: 15,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.gold,
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ─── FOOTER/HEADER ──────────────────────────────────────────
  pageFolio: {
    position: 'absolute',
    bottom: 30,
    right: 40,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gray,
  },
  pageLogoSmall: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    fontSize: 7,
    color: COLORS.gray,
    letterSpacing: 1,
  }
});

// ─── COMPONENTS ───────────────────────────────────────────────

const Article = ({ title, content, meta, color = COLORS.navy }: any) => (
  <View style={[S.articleCard, { borderLeftColor: color }]}>
    <Text style={S.articleTitle}>{title}</Text>
    <Text style={S.articleContent}>{content}</Text>
    <Text style={S.articleMeta}>{meta}</Text>
  </View>
);

const SectionHeading = ({ category, title }: any) => (
  <View style={S.sectionHeader}>
    <Text style={S.categoryLabel}>{category}</Text>
    <Text style={S.sectionTitle}>{title}</Text>
    <View style={S.sectionDivider} />
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
    <Document title={`SGA REPORT - ${dateStr}`}>
      {/* ═══════════════════════════════════════════════════════
          PÁGINA 1: PORTADA TIPO REVISTA
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.cover}>
          <View style={S.coverHeader}>
            <Image src="/logo-pna.png" style={S.logo} />
            <Text style={S.magazineTitle}>SGA</Text>
            <Text style={[S.magazineTitle, { color: COLORS.gold }]}>PZBP</Text>
            <Text style={S.magazineSubtitle}>Resumen Operativo Mensual</Text>
          </View>

          <View style={{ width: '100%', alignItems: 'center' }}>
            <View style={{ width: 100, height: 2, backgroundColor: COLORS.gold, marginBottom: 20 }} />
            <Text style={{ color: COLORS.white, fontSize: 10, letterSpacing: 4 }}>EDICIÓN ESPECIAL</Text>
          </View>

          <View style={S.coverFooter}>
            <View>
              <Text style={S.coverDate}>{dateStr.toUpperCase()}</Text>
              <Text style={S.issueNumber}>VOL. {new Date().getFullYear()} | N° {new Date().getMonth() + 1}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: COLORS.white, fontSize: 32, fontFamily: 'Helvetica-Bold' }}>{total}</Text>
              <Text style={{ color: COLORS.gold, fontSize: 8 }}>REGISTROS TOTALES</Text>
            </View>
          </View>
        </View>
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 2: RESUMEN Y ESTADÍSTICAS
          ═══════════════════════════════════════════════════════ */}
      <Page size="A4" style={S.page}>
        <View style={S.contentWrapper}>
          <SectionHeading category="EDITORIAL" title="Visión General de Operaciones" />
          
          <Text style={[S.articleContent, { fontSize: 11, marginBottom: 30, color: COLORS.slate }]}>
            El presente informe compila la actividad operativa de la Prefectura de Zona Bajo Paraná, 
            estructurado bajo un formato de análisis editorial para facilitar la lectura de indicadores clave.
          </Text>

          <View style={S.statsGrid}>
            <View style={S.statBox}>
              <Text style={S.statValue}>{visitas.length}</Text>
              <Text style={S.statLabel}>Visitas</Text>
            </View>
            <View style={[S.statBox, { backgroundColor: COLORS.accent }]}>
              <Text style={S.statValue}>{tareas.length}</Text>
              <Text style={S.statLabel}>Tareas</Text>
            </View>
            <View style={S.statBox}>
              <Text style={S.statValue}>{novedades.length}</Text>
              <Text style={S.statLabel}>Novedades</Text>
            </View>
          </View>

          <View style={{ marginTop: 40 }}>
            <SectionHeading category="ANÁLISIS" title="Personal y Despliegue" />
            <View style={S.articleRow}>
              <Article 
                title="Estado de Fuerza" 
                content={`Se registran ${personal.length} efectivos en situación operativa, con un enfoque en la optimización de recursos y patrullaje preventivo.`}
                meta="PERSONAL ACTIVO"
              />
              <Article 
                title="Diligencias" 
                content={`Se han procesado ${diligenciamientos.length} diligenciamientos en el período actual, asegurando el cumplimiento de los plazos administrativos.`}
                meta="ADMINISTRACIÓN"
                color={COLORS.gold}
              />
            </View>
          </View>
        </View>
        
        <Text style={S.pageLogoSmall}>SGA PZBP | {now}</Text>
        <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
      </Page>

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 3: CRÓNICAS (NOVEDADES)
          ═══════════════════════════════════════════════════════ */}
      {novedades.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeading category="CRÓNICAS" title="Novedades Destacadas" />
            
            <View style={{ gap: 15 }}>
              {novedades.slice(0, 6).map((n: any, i: number) => (
                <View key={i} style={{ borderBottomWidth: 1, borderBottomColor: COLORS.divider, paddingBottom: 15, marginBottom: 5 }}>
                  <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: COLORS.navy, marginBottom: 3 }}>
                    {n.title?.toUpperCase() || 'SIN TÍTULO'}
                  </Text>
                  <Text style={[S.articleContent, { textAlign: 'left' }]}>
                    {n.content?.slice(0, 250)}...
                  </Text>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
                    <Text style={{ fontSize: 7, color: COLORS.accent, fontFamily: 'Helvetica-Bold' }}>POR: {n.authorName?.toUpperCase() || 'SISTEMA'}</Text>
                    <Text style={{ fontSize: 7, color: COLORS.gray }}>FECHA: {new Date(n.created_at || n.createdAt).toLocaleDateString()}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
          
          <Text style={S.pageLogoSmall}>SGA PZBP | {now}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}

      {/* ═══════════════════════════════════════════════════════
          PÁGINA 4: REGISTRO TÉCNICO (VISITAS)
          ═══════════════════════════════════════════════════════ */}
      {visitas.length > 0 && (
        <Page size="A4" style={S.page}>
          <View style={S.contentWrapper}>
            <SectionHeading category="REGISTRO" title="Bitácora de Visitas Técnicas" />
            
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 15 }}>
              {visitas.slice(0, 10).map((v: any, i: number) => (
                <View key={i} style={{ width: '47%', backgroundColor: COLORS.white, padding: 12, borderTopWidth: 2, borderTopColor: COLORS.gold }}>
                  <Text style={{ fontSize: 8, color: COLORS.gray, marginBottom: 4 }}>{v.fecha} | {v.hora}</Text>
                  <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COLORS.navy }}>{v.origen} → {v.destino}</Text>
                  <Text style={{ fontSize: 8, color: COLORS.slate, marginTop: 5, fontStyle: 'italic' }}>{v.responsable}</Text>
                  {v.observaciones && (
                    <Text style={{ fontSize: 7, color: COLORS.gray, marginTop: 5 }}>OBS: {v.observaciones.slice(0, 80)}...</Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          
          <Text style={S.pageLogoSmall}>SGA PZBP | {now}</Text>
          <Text style={S.pageFolio} render={({ pageNumber }) => `— ${pageNumber} —`} />
        </Page>
      )}
    </Document>
  );
}
