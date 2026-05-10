import React from 'react';
import { Document, Image, Page, StyleSheet, Text, View } from '@react-pdf/renderer';

type ReportRecord = Record<string, string | number | null | undefined>;

type ReportEntry = [string, ReportRecord[]];

interface ReportPDFProps {
  data: Record<string, ReportRecord[]>;
  now: string;
  dateStr: string;
  filters?: {
    source: string;
    period: string;
    order: string;
  };
}

const COLORS = {
  black: '#1a1a1a',
  blue: '#0055ff',
  paper: '#f5f0e8',
  white: '#ffffff',
  gray: '#6b7280',
  line: '#1a1a1a',
  green: '#00cc66',
  orange: '#ff9900',
  red: '#e63b2e',
};

const SECTION_LABELS: Record<string, string> = {
  visitas: 'VISITAS TÉCNICAS',
  tareas: 'TAREAS OPERATIVAS',
  personal: 'PERSONAL',
  novedades: 'NOVEDADES',
  diligenciamientos: 'DILIGENCIAMIENTOS',
};

const COLUMN_MAP: Record<string, { key: string; label: string; width: string; long?: boolean }[]> = {
  visitas: [
    { key: 'fecha', label: 'FECHA', width: '13%' },
    { key: 'hora', label: 'HORA', width: '9%' },
    { key: 'origen', label: 'ORIGEN', width: '18%' },
    { key: 'destino', label: 'DESTINO', width: '18%' },
    { key: 'responsable', label: 'RESPONSABLE', width: '20%' },
    { key: 'observaciones', label: 'OBSERVACIONES', width: '22%', long: true },
  ],
  tareas: [
    { key: 'titulo', label: 'TAREA', width: '28%' },
    { key: 'prioridad', label: 'PRIORIDAD', width: '12%' },
    { key: 'estado', label: 'ESTADO', width: '14%' },
    { key: 'vencimiento', label: 'VENCE', width: '13%' },
    { key: 'descripcion', label: 'DESCRIPCIÓN', width: '23%', long: true },
    { key: 'subtareas', label: 'SUB.', width: '10%' },
  ],
  personal: [
    { key: 'nombre', label: 'NOMBRE', width: '42%' },
    { key: 'rol', label: 'ROL / FUNCIÓN', width: '36%' },
    { key: 'estado', label: 'ESTADO', width: '22%' },
  ],
  novedades: [
    { key: 'fecha', label: 'FECHA', width: '15%' },
    { key: 'titulo', label: 'TÍTULO', width: '28%' },
    { key: 'autor', label: 'AUTOR', width: '20%' },
    { key: 'contenido', label: 'CONTENIDO', width: '37%', long: true },
  ],
  diligenciamientos: [
    { key: 'fecha', label: 'FECHA', width: '14%' },
    { key: 'categoria', label: 'CATEGORÍA', width: '18%' },
    { key: 'titulo', label: 'TÍTULO', width: '25%' },
    { key: 'autor', label: 'AUTOR', width: '18%' },
    { key: 'detalle', label: 'DETALLE', width: '25%', long: true },
  ],
};

const styles = StyleSheet.create({
  page: {
    padding: 28,
    fontFamily: 'Helvetica',
    color: COLORS.black,
    backgroundColor: COLORS.paper,
  },
  coverPage: {
    padding: 26,
    fontFamily: 'Helvetica',
    backgroundColor: COLORS.paper,
    color: COLORS.black,
  },
  coverFrame: {
    height: '100%',
    borderWidth: 4,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  coverTopBar: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  topBarTitle: {
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.8,
  },
  topBarCode: {
    fontSize: 9,
    color: COLORS.paper,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.4,
  },
  coverBody: {
    flex: 1,
    paddingHorizontal: 34,
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  logoPanel: {
    alignItems: 'center',
  },
  logoShadow: {
    width: 170,
    height: 170,
    backgroundColor: COLORS.black,
    marginLeft: 10,
    marginTop: 10,
  },
  logoBox: {
    position: 'absolute',
    width: 170,
    height: 170,
    backgroundColor: COLORS.white,
    borderWidth: 4,
    borderColor: COLORS.black,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: 128,
    height: 128,
    objectFit: 'contain',
  },
  coverLabel: {
    marginTop: 24,
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: COLORS.black,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.6,
  },
  coverTitleWrap: {
    alignItems: 'center',
    marginTop: 22,
  },
  coverTitle: {
    fontSize: 36,
    lineHeight: 1,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  coverSubtitle: {
    marginTop: 10,
    fontSize: 11,
    lineHeight: 1.45,
    textAlign: 'center',
    maxWidth: 360,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gray,
  },
  metaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    width: '100%',
  },
  metaCard: {
    width: '48.5%',
    minHeight: 58,
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.paper,
    padding: 9,
    marginBottom: 9,
  },
  metaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.4,
    color: COLORS.blue,
    marginBottom: 5,
  },
  metaValue: {
    fontSize: 10,
    lineHeight: 1.25,
    fontFamily: 'Helvetica-Bold',
  },
  header: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.1,
  },
  headerMeta: {
    fontSize: 7,
    color: COLORS.paper,
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 14,
  },
  stat: {
    width: '24%',
    minHeight: 58,
    padding: 8,
    marginRight: '1%',
    marginBottom: 7,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.black,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.black,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 6.5,
    color: COLORS.gray,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.2,
  },
  criteriaBox: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
    marginTop: 8,
  },
  criteriaHeader: {
    backgroundColor: COLORS.blue,
    color: COLORS.white,
    padding: 8,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  criteriaRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
    minHeight: 29,
  },
  criteriaKey: {
    width: '28%',
    padding: 7,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    backgroundColor: COLORS.paper,
    borderRightWidth: 2,
    borderRightColor: COLORS.black,
  },
  criteriaValue: {
    width: '72%',
    padding: 7,
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.25,
  },
  section: {
    borderWidth: 2,
    borderColor: COLORS.black,
    backgroundColor: COLORS.white,
  },
  sectionHeader: {
    backgroundColor: COLORS.black,
    color: COLORS.white,
    paddingVertical: 9,
    paddingHorizontal: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 7,
    color: COLORS.paper,
    fontFamily: 'Helvetica-Bold',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: COLORS.blue,
    color: COLORS.white,
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    borderRightWidth: 1,
    borderRightColor: COLORS.black,
  },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1.5,
    borderTopColor: COLORS.black,
    minHeight: 30,
  },
  tableCell: {
    padding: 6,
    fontSize: 6.9,
    lineHeight: 1.22,
    borderRightWidth: 1,
    borderRightColor: COLORS.black,
  },
  note: {
    padding: 9,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.gray,
    textAlign: 'center',
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
    backgroundColor: COLORS.paper,
  },
  footer: {
    position: 'absolute',
    left: 28,
    right: 28,
    bottom: 12,
    paddingTop: 6,
    borderTopWidth: 2,
    borderTopColor: COLORS.black,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.black,
  },
});

function reportText(value: unknown, fallback = '—'): string {
  if (value === null || value === undefined || value === '') return fallback;
  const raw = Array.isArray(value) ? value.join(', ') : String(value);
  const cleaned = raw.replace(/\s+/g, ' ').trim();
  return (cleaned || fallback).toUpperCase();
}

function truncateText(value: unknown, max = 90): string {
  const text = reportText(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function getNonEmptyEntries(data: Record<string, ReportRecord[]>): ReportEntry[] {
  return Object.entries(data).filter(([, records]) => records.length > 0);
}

function getTotal(data: Record<string, ReportRecord[]>): number {
  return getNonEmptyEntries(data).reduce((sum, [, records]) => sum + records.length, 0);
}

function getTaskCompletion(data: Record<string, ReportRecord[]>): string {
  const tasks = data.tareas || [];
  if (tasks.length === 0) return '0%';
  const done = tasks.filter((task) => reportText(task.estado) === 'COMPLETADO').length;
  return `${Math.round((done / tasks.length) * 100)}%`;
}

function Header({ now }: { now: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerTitle}>SGA PZBP · REPORTE OPERATIVO</Text>
      <Text style={styles.headerMeta}>GENERADO: {reportText(now)}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>PREFECTURA NAVAL ARGENTINA · SGA PZBP</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `PÁGINA ${pageNumber} DE ${totalPages}`} />
    </View>
  );
}

function Summary({ data }: { data: Record<string, ReportRecord[]> }) {
  const sections = getNonEmptyEntries(data).map(([key, records]) => ({
    key,
    label: SECTION_LABELS[key] || reportText(key),
    count: records.length,
  }));

  return (
    <View style={styles.summaryGrid}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{getTotal(data)}</Text>
        <Text style={styles.statLabel}>TOTAL DE REGISTROS</Text>
      </View>
      {data.tareas?.length ? (
        <View style={styles.stat}>
          <Text style={styles.statValue}>{getTaskCompletion(data)}</Text>
          <Text style={styles.statLabel}>COMPLETITUD TAREAS</Text>
        </View>
      ) : null}
      {sections.map((item) => (
        <View key={item.key} style={styles.stat}>
          <Text style={styles.statValue}>{item.count}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function Criteria({ filters }: { filters?: ReportPDFProps['filters'] }) {
  return (
    <View style={styles.criteriaBox}>
      <Text style={styles.criteriaHeader}>CRITERIOS DEL REPORTE</Text>
      <View style={styles.criteriaRow}>
        <Text style={styles.criteriaKey}>FUENTE</Text>
        <Text style={styles.criteriaValue}>{reportText(filters?.source || 'TODAS LAS FUENTES')}</Text>
      </View>
      <View style={styles.criteriaRow}>
        <Text style={styles.criteriaKey}>PERÍODO</Text>
        <Text style={styles.criteriaValue}>{reportText(filters?.period || 'SIN LÍMITE')}</Text>
      </View>
      <View style={styles.criteriaRow}>
        <Text style={styles.criteriaKey}>ORDEN</Text>
        <Text style={styles.criteriaValue}>{reportText(filters?.order || 'FECHA DESCENDENTE')}</Text>
      </View>
    </View>
  );
}

function DataSection({ name, records }: { name: string; records: ReportRecord[] }) {
  const columns = COLUMN_MAP[name] || [];
  const limitedRecords = records.slice(0, 70);

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS[name] || reportText(name)}</Text>
        <Text style={styles.sectionCount}>{records.length} REGISTROS</Text>
      </View>
      <View style={styles.tableHeader}>
        {columns.map((column) => (
          <Text key={column.key} style={[styles.tableHeaderCell, { width: column.width }]}>
            {column.label}
          </Text>
        ))}
      </View>
      {limitedRecords.map((record, index) => (
        <View key={`${name}-${index}`} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.paper }]}>
          {columns.map((column) => (
            <Text key={column.key} style={[styles.tableCell, { width: column.width }]}>
              {truncateText(record[column.key], column.long ? 130 : 58)}
            </Text>
          ))}
        </View>
      ))}
      {records.length > limitedRecords.length && (
        <Text style={styles.note}>SE MUESTRAN {limitedRecords.length} DE {records.length} REGISTROS PARA MANTENER LEGIBLE EL PDF.</Text>
      )}
    </View>
  );
}

export default function ReportPDF({ data, now, dateStr, filters }: ReportPDFProps) {
  const dataEntries = getNonEmptyEntries(data);
  const total = getTotal(data);
  const iconSrc = typeof window !== 'undefined' ? `${window.location.origin}/pwa-192x192.png` : '/pwa-192x192.png';

  return (
    <Document>
      <Page size="A4" style={styles.coverPage}>
        <View style={styles.coverFrame}>
          <View style={styles.coverTopBar}>
            <Text style={styles.topBarTitle}>PREFECTURA NAVAL ARGENTINA</Text>
            <Text style={styles.topBarCode}>SGA PZBP</Text>
          </View>
          <View style={styles.coverBody}>
            <View style={styles.logoPanel}>
              <View style={styles.logoShadow} />
              <View style={styles.logoBox}>
                <Image src={iconSrc} style={styles.logo} />
              </View>
              <Text style={styles.coverLabel}>SISTEMA DE GESTIÓN DE ACTIVIDADES</Text>
              <View style={styles.coverTitleWrap}>
                <Text style={styles.coverTitle}>REPORTE OPERATIVO</Text>
                <Text style={styles.coverSubtitle}>INFORME INSTITUCIONAL NORMALIZADO PARA CONTROL, SEGUIMIENTO Y DISTRIBUCIÓN OPERATIVA.</Text>
              </View>
            </View>

            <View style={styles.metaGrid}>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>FUENTE</Text>
                <Text style={styles.metaValue}>{reportText(filters?.source || 'TODAS LAS FUENTES')}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>PERÍODO</Text>
                <Text style={styles.metaValue}>{reportText(filters?.period || 'SIN LÍMITE')}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>REGISTROS</Text>
                <Text style={styles.metaValue}>{total}</Text>
              </View>
              <View style={styles.metaCard}>
                <Text style={styles.metaLabel}>GENERADO</Text>
                <Text style={styles.metaValue}>{reportText(dateStr)}</Text>
              </View>
            </View>
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Header now={now} />
        <Summary data={data} />
        <Criteria filters={filters} />
        <Footer />
      </Page>

      {dataEntries.map(([name, records]) => (
        <Page key={name} size="A4" style={styles.page}>
          <Header now={now} />
          <DataSection name={name} records={records} />
          <Footer />
        </Page>
      ))}
    </Document>
  );
}
