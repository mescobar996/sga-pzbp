import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

type ReportRecord = Record<string, string | number | null | undefined>;

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
  ink: '#18202f',
  muted: '#647084',
  line: '#d8dee9',
  soft: '#f3f6fb',
  white: '#ffffff',
  blue: '#0055ff',
  green: '#0f9f6e',
  orange: '#d97706',
  red: '#dc2626',
};

const SECTION_LABELS: Record<string, string> = {
  visitas: 'Visitas técnicas',
  tareas: 'Tareas operativas',
  personal: 'Personal',
  novedades: 'Novedades',
  diligenciamientos: 'Diligenciamientos',
};

const COLUMN_MAP: Record<string, { key: string; label: string; width: string }[]> = {
  visitas: [
    { key: 'fecha', label: 'Fecha', width: '13%' },
    { key: 'hora', label: 'Hora', width: '9%' },
    { key: 'origen', label: 'Origen', width: '18%' },
    { key: 'destino', label: 'Destino', width: '18%' },
    { key: 'responsable', label: 'Responsable', width: '20%' },
    { key: 'observaciones', label: 'Observaciones', width: '22%' },
  ],
  tareas: [
    { key: 'titulo', label: 'Tarea', width: '28%' },
    { key: 'prioridad', label: 'Prioridad', width: '12%' },
    { key: 'estado', label: 'Estado', width: '14%' },
    { key: 'vencimiento', label: 'Vence', width: '13%' },
    { key: 'descripcion', label: 'Descripción', width: '23%' },
    { key: 'subtareas', label: 'Sub.', width: '10%' },
  ],
  personal: [
    { key: 'nombre', label: 'Nombre', width: '42%' },
    { key: 'rol', label: 'Rol / función', width: '36%' },
    { key: 'estado', label: 'Estado', width: '22%' },
  ],
  novedades: [
    { key: 'fecha', label: 'Fecha', width: '15%' },
    { key: 'titulo', label: 'Título', width: '28%' },
    { key: 'autor', label: 'Autor', width: '20%' },
    { key: 'contenido', label: 'Contenido', width: '37%' },
  ],
  diligenciamientos: [
    { key: 'fecha', label: 'Fecha', width: '14%' },
    { key: 'categoria', label: 'Categoría', width: '18%' },
    { key: 'titulo', label: 'Título', width: '25%' },
    { key: 'autor', label: 'Autor', width: '18%' },
    { key: 'detalle', label: 'Detalle', width: '25%' },
  ],
};

const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontFamily: 'Helvetica',
    color: COLORS.ink,
    backgroundColor: COLORS.white,
  },
  cover: {
    padding: 34,
    height: '100%',
    backgroundColor: COLORS.ink,
    color: COLORS.white,
  },
  coverKicker: {
    fontSize: 9,
    color: COLORS.blue,
    textTransform: 'uppercase',
    letterSpacing: 1.8,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 22,
  },
  coverTitle: {
    fontSize: 38,
    lineHeight: 1.06,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 14,
  },
  coverSubtitle: {
    fontSize: 12,
    color: '#dbe7ff',
    lineHeight: 1.5,
    width: '78%',
    marginBottom: 34,
  },
  coverMetaGrid: {
    flexDirection: 'row',
    marginTop: 30,
  },
  coverMetaBox: {
    width: '33.33%',
    padding: 12,
    borderWidth: 1,
    borderColor: '#30415f',
    marginRight: 8,
  },
  coverMetaLabel: {
    fontSize: 7,
    textTransform: 'uppercase',
    letterSpacing: 1.1,
    color: '#9badc8',
    marginBottom: 6,
  },
  coverMetaValue: {
    fontSize: 13,
    fontFamily: 'Helvetica-Bold',
    color: COLORS.white,
  },
  header: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.line,
    paddingBottom: 12,
    marginBottom: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 15,
    fontFamily: 'Helvetica-Bold',
  },
  headerMeta: {
    fontSize: 8,
    color: COLORS.muted,
    textAlign: 'right',
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 18,
  },
  stat: {
    width: '19%',
    minHeight: 58,
    padding: 9,
    marginRight: '1%',
    marginBottom: 8,
    backgroundColor: COLORS.soft,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.blue,
  },
  statValue: {
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 7,
    color: COLORS.muted,
    textTransform: 'uppercase',
    lineHeight: 1.25,
  },
  section: {
    marginTop: 14,
    marginBottom: 16,
  },
  sectionHeader: {
    backgroundColor: COLORS.ink,
    color: COLORS.white,
    paddingVertical: 9,
    paddingHorizontal: 11,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: 8,
    color: '#c7d2e5',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#eef3fb',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.line,
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 7,
    color: COLORS.muted,
    fontFamily: 'Helvetica-Bold',
    textTransform: 'uppercase',
    borderRightWidth: 1,
    borderRightColor: COLORS.line,
  },
  tableRow: {
    flexDirection: 'row',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.line,
    minHeight: 30,
  },
  tableCell: {
    padding: 6,
    fontSize: 7.2,
    lineHeight: 1.25,
    borderRightWidth: 1,
    borderRightColor: COLORS.line,
  },
  muted: {
    color: COLORS.muted,
  },
  empty: {
    padding: 18,
    borderWidth: 1,
    borderColor: COLORS.line,
    color: COLORS.muted,
    fontSize: 9,
    textAlign: 'center',
  },
  footer: {
    position: 'absolute',
    left: 30,
    right: 30,
    bottom: 16,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.line,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: {
    fontSize: 7,
    color: COLORS.muted,
  },
});

function clean(value: unknown, max = 90): string {
  if (value === null || value === undefined || value === '') return '—';
  const text = String(value).replace(/\s+/g, ' ').trim();
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function getTotal(data: Record<string, ReportRecord[]>): number {
  return Object.values(data).reduce((sum, records) => sum + records.length, 0);
}

function getTaskCompletion(data: Record<string, ReportRecord[]>): string {
  const tasks = data.tareas || [];
  if (tasks.length === 0) return '0%';
  const done = tasks.filter((task) => String(task.estado).toLowerCase() === 'completado').length;
  return `${Math.round((done / tasks.length) * 100)}%`;
}

function Header({ now }: { now: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerTitle}>SGA PZBP · Reporte operativo</Text>
      <Text style={styles.headerMeta}>Generado: {now}</Text>
    </View>
  );
}

function Footer() {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Prefectura Naval Argentina · SGA PZBP</Text>
      <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} de ${totalPages}`} />
    </View>
  );
}

function Summary({ data }: { data: Record<string, ReportRecord[]> }) {
  const sections = Object.entries(SECTION_LABELS).map(([key, label]) => ({ key, label, count: data[key]?.length || 0 }));

  return (
    <View style={styles.summaryGrid}>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{getTotal(data)}</Text>
        <Text style={styles.statLabel}>Total de registros</Text>
      </View>
      <View style={styles.stat}>
        <Text style={styles.statValue}>{getTaskCompletion(data)}</Text>
        <Text style={styles.statLabel}>Completitud tareas</Text>
      </View>
      {sections.map((item) => (
        <View key={item.key} style={styles.stat}>
          <Text style={styles.statValue}>{item.count}</Text>
          <Text style={styles.statLabel}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function DataSection({ name, records }: { name: string; records: ReportRecord[] }) {
  const columns = COLUMN_MAP[name] || [];
  const limitedRecords = records.slice(0, 60);

  return (
    <View style={styles.section} wrap={false}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{SECTION_LABELS[name] || name}</Text>
        <Text style={styles.sectionCount}>{records.length} registros</Text>
      </View>

      {records.length === 0 ? (
        <Text style={styles.empty}>Sin datos para esta sección.</Text>
      ) : (
        <>
          <View style={styles.tableHeader}>
            {columns.map((column) => (
              <Text key={column.key} style={[styles.tableHeaderCell, { width: column.width }]}>
                {column.label}
              </Text>
            ))}
          </View>
          {limitedRecords.map((record, index) => (
            <View key={`${name}-${index}`} style={[styles.tableRow, { backgroundColor: index % 2 === 0 ? COLORS.white : COLORS.soft }]}>
              {columns.map((column) => (
                <Text key={column.key} style={[styles.tableCell, { width: column.width }]}>
                  {clean(record[column.key], column.key === 'observaciones' || column.key === 'contenido' || column.key === 'detalle' || column.key === 'descripcion' ? 120 : 54)}
                </Text>
              ))}
            </View>
          ))}
          {records.length > limitedRecords.length && (
            <Text style={[styles.empty, styles.muted]}>Se muestran {limitedRecords.length} de {records.length} registros para mantener legible el PDF.</Text>
          )}
        </>
      )}
    </View>
  );
}

export default function ReportPDF({ data, now, dateStr, filters }: ReportPDFProps) {
  const total = getTotal(data);

  return (
    <Document>
      <Page size="A4" style={styles.cover}>
        <Text style={styles.coverKicker}>Prefectura Naval Argentina · SGA PZBP</Text>
        <Text style={styles.coverTitle}>Reporte operativo consolidado</Text>
        <Text style={styles.coverSubtitle}>
          Informe ordenado por módulos, con columnas normalizadas para lectura rápida, control interno y distribución operativa.
        </Text>
        <View style={styles.coverMetaGrid}>
          <View style={styles.coverMetaBox}>
            <Text style={styles.coverMetaLabel}>Fecha</Text>
            <Text style={styles.coverMetaValue}>{dateStr}</Text>
          </View>
          <View style={styles.coverMetaBox}>
            <Text style={styles.coverMetaLabel}>Registros</Text>
            <Text style={styles.coverMetaValue}>{total}</Text>
          </View>
          <View style={styles.coverMetaBox}>
            <Text style={styles.coverMetaLabel}>Período</Text>
            <Text style={styles.coverMetaValue}>{filters?.period || 'Sin límite'}</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={styles.page}>
        <Header now={now} />
        <Summary data={data} />
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Criterios del reporte</Text>
            <Text style={styles.sectionCount}>configuración</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '28%', fontFamily: 'Helvetica-Bold' }]}>Fuente</Text>
            <Text style={[styles.tableCell, { width: '72%' }]}>{filters?.source || 'Todas las fuentes'}</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, { width: '28%', fontFamily: 'Helvetica-Bold' }]}>Orden</Text>
            <Text style={[styles.tableCell, { width: '72%' }]}>{filters?.order || 'Fecha descendente'}</Text>
          </View>
        </View>
        <Footer />
      </Page>

      {Object.entries(data).map(([name, records]) => (
        <Page key={name} size="A4" style={styles.page}>
          <Header now={now} />
          <DataSection name={name} records={records} />
          <Footer />
        </Page>
      ))}
    </Document>
  );
}
