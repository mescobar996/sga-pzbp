import React from 'react';
import { Document, Page, Text, View, Image, StyleSheet } from '@react-pdf/renderer';

const C = {
  paper: '#f5f0e8',
  ink: '#1a1a1a',
  white: '#ffffff',
  blue: '#0055ff',
  green: '#00cc66',
  red: '#e63b2e',
  muted: '#6b6258',
  line: '#1a1a1a',
};

const A4 = {
  pageX: 28,
  headerH: 48,
  footerH: 28,
};

const text = (value: unknown, fallback = 'S/E') => {
  if (value === null || value === undefined || value === '') return fallback;
  return String(value).toLocaleUpperCase('es-AR');
};

const dateText = (value: unknown, fallback = 'S/E') => {
  if (!value) return fallback;
  const raw = String(value);
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return text(raw, fallback);
  return date.toLocaleDateString('es-AR').toLocaleUpperCase('es-AR');
};

const dateTimeText = (value: unknown, fallback = 'S/E') => {
  if (!value) return fallback;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return text(value, fallback);
  return date.toLocaleString('es-AR').toLocaleUpperCase('es-AR');
};

const clip = (value: unknown, length = 120) => {
  const valueText = text(value);
  return valueText.length > length ? `${valueText.slice(0, length - 3)}...` : valueText;
};

const statusColor = (value: unknown) => {
  const v = text(value, '').toLowerCase();
  if (v.includes('completado') || v.includes('activo') || v.includes('operativo') || v.includes('baja')) return C.green;
  if (v.includes('alta') || v.includes('urgente') || v.includes('eliminado') || v.includes('inactivo')) return C.red;
  if (v.includes('media') || v.includes('pendiente') || v.includes('proceso') || v.includes('mantenimiento')) return C.blue;
  return C.ink;
};

const sourceLabels: Record<string, string> = {
  visitas: 'VISITAS TECNICAS',
  tareas: 'TAREAS OPERATIVAS',
  personal: 'PERSONAL ACTIVO',
  novedades: 'NOVEDADES',
  diligenciamientos: 'DILIGENCIAMIENTOS',
};

const S = StyleSheet.create({
  page: {
    backgroundColor: C.paper,
    color: C.ink,
    fontFamily: 'Helvetica',
    paddingTop: A4.headerH + 24,
    paddingHorizontal: A4.pageX,
    paddingBottom: A4.footerH + 22,
  },
  coverPage: {
    backgroundColor: C.paper,
    color: C.ink,
    fontFamily: 'Helvetica',
    padding: A4.pageX,
  },
  coverFrame: {
    height: '100%',
    borderWidth: 4,
    borderColor: C.ink,
    backgroundColor: C.white,
    padding: 24,
  },
  coverTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    borderBottomWidth: 4,
    borderBottomColor: C.ink,
    paddingBottom: 18,
  },
  logo: {
    width: 58,
    height: 58,
    objectFit: 'contain',
  },
  brandBlock: {
    alignItems: 'flex-end',
  },
  eyebrow: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.8,
    color: C.blue,
  },
  brand: {
    marginTop: 3,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.4,
  },
  coverTitleWrap: {
    marginTop: 60,
    borderWidth: 4,
    borderColor: C.ink,
    backgroundColor: C.paper,
    padding: 20,
  },
  coverTitle: {
    fontSize: 42,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 0.95,
    letterSpacing: -1,
  },
  coverSubtitle: {
    marginTop: 10,
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.8,
    color: C.blue,
  },
  coverMetaGrid: {
    marginTop: 26,
    flexDirection: 'row',
    gap: 10,
  },
  coverMeta: {
    flex: 1,
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: C.white,
    padding: 10,
  },
  coverMetaLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.4,
    color: C.muted,
  },
  coverMetaValue: {
    marginTop: 6,
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
  },
  coverTotal: {
    marginTop: 30,
    backgroundColor: C.ink,
    color: C.white,
    padding: 18,
    borderWidth: 4,
    borderColor: C.ink,
  },
  coverTotalNumber: {
    fontSize: 52,
    fontFamily: 'Helvetica-Bold',
    color: C.white,
    lineHeight: 0.9,
  },
  coverTotalLabel: {
    marginTop: 8,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 2,
    color: C.white,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: A4.headerH,
    backgroundColor: C.paper,
    borderBottomWidth: 4,
    borderBottomColor: C.ink,
    paddingHorizontal: A4.pageX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerBrand: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.2,
  },
  headerSection: {
    fontSize: 8,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1.6,
    color: C.blue,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: A4.footerH,
    backgroundColor: C.white,
    borderTopWidth: 3,
    borderTopColor: C.ink,
    paddingHorizontal: A4.pageX,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.6,
    color: C.muted,
  },
  sectionBar: {
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: C.white,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginBottom: 14,
  },
  sectionKicker: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
    letterSpacing: 1.6,
  },
  sectionTitle: {
    marginTop: 3,
    fontSize: 18,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: -0.4,
  },
  statGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 18,
  },
  statCard: {
    width: '31.8%',
    minHeight: 74,
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: C.white,
    padding: 10,
  },
  statLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 1,
    color: C.muted,
  },
  statValue: {
    marginTop: 8,
    fontSize: 28,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 0.95,
  },
  statAccent: {
    marginTop: 8,
    height: 5,
    width: 34,
    backgroundColor: C.blue,
  },
  table: {
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: C.white,
    marginBottom: 14,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.ink,
    color: C.white,
  },
  th: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 0.8,
    color: C.white,
    borderRightWidth: 1,
    borderRightColor: C.white,
  },
  row: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: C.ink,
    minHeight: 30,
  },
  rowAlt: {
    backgroundColor: C.paper,
  },
  td: {
    paddingVertical: 7,
    paddingHorizontal: 6,
    fontSize: 7.5,
    lineHeight: 1.25,
    borderRightWidth: 1,
    borderRightColor: C.ink,
  },
  tdStrong: {
    fontFamily: 'Helvetica-Bold',
  },
  badge: {
    alignSelf: 'flex-start',
    minWidth: 54,
    paddingVertical: 3,
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: C.ink,
    color: C.white,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
  cardList: {
    gap: 8,
  },
  recordCard: {
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: C.white,
    marginBottom: 8,
  },
  recordHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: C.paper,
    borderBottomWidth: 2,
    borderBottomColor: C.ink,
    paddingVertical: 7,
    paddingHorizontal: 9,
    gap: 8,
  },
  recordTitle: {
    flex: 1,
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    lineHeight: 1.15,
  },
  recordMeta: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: C.blue,
  },
  recordBody: {
    padding: 9,
    fontSize: 8,
    lineHeight: 1.35,
  },
  moduleTag: {
    marginTop: 5,
    alignSelf: 'flex-start',
    borderWidth: 2,
    borderColor: C.ink,
    backgroundColor: C.blue,
    color: C.white,
    paddingVertical: 3,
    paddingHorizontal: 6,
    fontSize: 6.5,
    fontFamily: 'Helvetica-Bold',
  },
  emptyState: {
    borderWidth: 3,
    borderColor: C.ink,
    backgroundColor: C.white,
    padding: 18,
    fontSize: 10,
    fontFamily: 'Helvetica-Bold',
    textAlign: 'center',
  },
});

type Props = {
  data: Record<string, any[]>;
  now: string;
  dateStr: string;
};

type Column = {
  label: string;
  width: string;
  render: (item: any) => React.ReactNode;
};

const Header = ({ section, now }: { section: string; now: string }) => (
  <View style={S.header} fixed>
    <Text style={S.headerBrand}>PREFECTURA NAVAL ARGENTINA</Text>
    <Text style={S.headerSection}>{text(section)}</Text>
    <Text style={S.headerBrand}>{text(now)}</Text>
  </View>
);

const Footer = () => (
  <View style={S.footer} fixed>
    <Text style={S.footerText}>SGA PZBP - SISTEMA DE GESTION DE ACTIVIDADES</Text>
    <Text style={S.footerText} render={({ pageNumber, totalPages }) => `PAGINA ${pageNumber} DE ${totalPages}`} />
  </View>
);

const SectionTitle = ({ kicker, title }: { kicker: string; title: string }) => (
  <View style={S.sectionBar}>
    <Text style={S.sectionKicker}>{text(kicker)}</Text>
    <Text style={S.sectionTitle}>{text(title)}</Text>
  </View>
);

const StatCard = ({ label, value, color = C.blue }: { label: string; value: number; color?: string }) => (
  <View style={S.statCard}>
    <Text style={S.statLabel}>{text(label)}</Text>
    <Text style={S.statValue}>{value}</Text>
    <View style={[S.statAccent, { backgroundColor: color }]} />
  </View>
);

const Badge = ({ value }: { value: unknown }) => (
  <Text style={[S.badge, { backgroundColor: statusColor(value) }]}>{text(value)}</Text>
);

const DataTable = ({ columns, rows }: { columns: Column[]; rows: any[] }) => (
  <View style={S.table}>
    <View style={S.tableHeader}>
      {columns.map((column) => (
        <Text key={column.label} style={[S.th, { width: column.width }]}>
          {text(column.label)}
        </Text>
      ))}
    </View>
    {rows.map((item, index) => (
      <View key={item.id || index} style={[S.row, index % 2 === 0 ? S.rowAlt : null]} wrap={false}>
        {columns.map((column) => (
          <View key={column.label} style={[S.td, { width: column.width }]}>
            {column.render(item)}
          </View>
        ))}
      </View>
    ))}
  </View>
);

const RecordCard = ({
  title,
  meta,
  body,
  tag,
}: {
  title: unknown;
  meta?: unknown;
  body?: unknown;
  tag?: unknown;
}) => (
  <View style={S.recordCard} wrap={false}>
    <View style={S.recordHead}>
      <Text style={S.recordTitle}>{text(title, 'SIN TITULO')}</Text>
      {meta ? <Text style={S.recordMeta}>{text(meta)}</Text> : null}
    </View>
    <Text style={S.recordBody}>{text(body, 'SIN DETALLE')}</Text>
    {tag ? <Text style={S.moduleTag}>{`MODULO: ${text(tag)}`}</Text> : null}
  </View>
);

export default function ReportPDF({ data, now, dateStr }: Props) {
  const visitas = data.visitas || [];
  const tareas = data.tareas || [];
  const novedades = data.novedades || [];
  const diligenciamientos = data.diligenciamientos || [];
  const personal = data.personal || [];
  const total = visitas.length + tareas.length + novedades.length + diligenciamientos.length + personal.length;
  const generatedAt = text(now);
  const reportDate = text(dateStr);

  const resumenRows = [
    ['VISITAS TECNICAS', visitas.length, C.green],
    ['TAREAS OPERATIVAS', tareas.length, C.blue],
    ['PERSONAL ACTIVO', personal.length, C.ink],
    ['NOVEDADES', novedades.length, C.red],
    ['DILIGENCIAMIENTOS', diligenciamientos.length, C.blue],
  ] as const;

  const categoryCounts = diligenciamientos.reduce<Record<string, number>>((acc, item) => {
    const category = text(item.category, 'OTROS');
    acc[category] = (acc[category] || 0) + 1;
    return acc;
  }, {});

  const tareasColumns: Column[] = [
    { label: 'TITULO', width: '42%', render: (item) => <Text style={S.tdStrong}>{clip(item.title, 56)}</Text> },
    { label: 'PRIORIDAD', width: '18%', render: (item) => <Badge value={item.priority} /> },
    { label: 'ESTADO', width: '20%', render: (item) => <Badge value={item.status} /> },
    { label: 'VENCIMIENTO', width: '20%', render: (item) => <Text>{dateText(item.dueDate)}</Text> },
  ];

  const personalColumns: Column[] = [
    { label: 'NOMBRE', width: '48%', render: (item) => <Text style={S.tdStrong}>{clip(item.name, 52)}</Text> },
    { label: 'ROL', width: '28%', render: (item) => <Text>{clip(item.role, 32)}</Text> },
    { label: 'ESTADO', width: '24%', render: (item) => <Badge value={item.status} /> },
  ];

  const visitasColumns: Column[] = [
    { label: 'FECHA', width: '16%', render: (item) => <Text style={S.tdStrong}>{dateText(item.fecha)}</Text> },
    { label: 'ORIGEN', width: '22%', render: (item) => <Text>{clip(item.origen, 30)}</Text> },
    { label: 'DESTINO', width: '22%', render: (item) => <Text>{clip(item.destino, 30)}</Text> },
    { label: 'RESPONSABLE', width: '22%', render: (item) => <Text>{clip(item.responsable, 30)}</Text> },
    { label: 'HORA', width: '18%', render: (item) => <Text>{text(item.hora)}</Text> },
  ];

  return (
    <Document title={`REPORTE SGA PZBP - ${reportDate}`}>
      <Page size="A4" style={S.coverPage}>
        <View style={S.coverFrame}>
          <View style={S.coverTop}>
            <Image src="/logo-pna.png" style={S.logo} />
            <View style={S.brandBlock}>
              <Text style={S.eyebrow}>SISTEMA DE GESTION DE ACTIVIDADES</Text>
              <Text style={S.brand}>PREFECTURA NAVAL ARGENTINA</Text>
              <Text style={S.eyebrow}>PZBP - MS</Text>
            </View>
          </View>

          <View style={S.coverTitleWrap}>
            <Text style={S.coverTitle}>REPORTE</Text>
            <Text style={S.coverTitle}>SGA PZBP</Text>
            <Text style={S.coverSubtitle}>EXPORTACION OPERATIVA DE DATOS</Text>
          </View>

          <View style={S.coverMetaGrid}>
            <View style={S.coverMeta}>
              <Text style={S.coverMetaLabel}>FECHA</Text>
              <Text style={S.coverMetaValue}>{reportDate}</Text>
            </View>
            <View style={S.coverMeta}>
              <Text style={S.coverMetaLabel}>GENERADO</Text>
              <Text style={S.coverMetaValue}>{generatedAt}</Text>
            </View>
          </View>

          <View style={S.coverTotal}>
            <Text style={S.coverTotalNumber}>{total}</Text>
            <Text style={S.coverTotalLabel}>REGISTROS TOTALES</Text>
          </View>
        </View>
      </Page>

      <Page size="A4" style={S.page}>
        <Header section="RESUMEN GENERAL" now={now} />
        <Footer />
        <SectionTitle kicker="PANEL DE CONTROL" title="RESUMEN GENERAL" />
        <View style={S.statGrid}>
          {resumenRows.map(([label, value, color]) => (
            <StatCard key={label} label={label} value={value} color={color} />
          ))}
          <StatCard label="TOTAL" value={total} color={C.ink} />
        </View>

        <SectionTitle kicker="DILIGENCIAMIENTOS" title="DESGLOSE POR MODULO" />
        {Object.keys(categoryCounts).length > 0 ? (
          <DataTable
            rows={Object.entries(categoryCounts).map(([category, count]) => ({ category, count }))}
            columns={[
              { label: 'MODULO', width: '72%', render: (item) => <Text style={S.tdStrong}>{text(item.category)}</Text> },
              { label: 'REGISTROS', width: '28%', render: (item) => <Text style={S.tdStrong}>{item.count}</Text> },
            ]}
          />
        ) : (
          <Text style={S.emptyState}>SIN DILIGENCIAMIENTOS PARA MOSTRAR</Text>
        )}
      </Page>

      {tareas.length > 0 && (
        <Page size="A4" style={S.page}>
          <Header section={sourceLabels.tareas} now={now} />
          <Footer />
          <SectionTitle kicker="OPERACIONES" title={sourceLabels.tareas} />
          <DataTable columns={tareasColumns} rows={tareas} />
        </Page>
      )}

      {visitas.length > 0 && (
        <Page size="A4" style={S.page}>
          <Header section={sourceLabels.visitas} now={now} />
          <Footer />
          <SectionTitle kicker="REGISTRO" title={sourceLabels.visitas} />
          <DataTable columns={visitasColumns} rows={visitas} />
        </Page>
      )}

      {diligenciamientos.length > 0 && (
        <Page size="A4" style={S.page}>
          <Header section={sourceLabels.diligenciamientos} now={now} />
          <Footer />
          <SectionTitle kicker="ADMINISTRACION" title={sourceLabels.diligenciamientos} />
          <View style={S.cardList}>
            {diligenciamientos.map((item, index) => (
              <RecordCard
                key={item.id || index}
                title={item.title}
                meta={dateText(item.created_at || item.fecha)}
                body={item.content}
                tag={item.category || 'OTROS'}
              />
            ))}
          </View>
        </Page>
      )}

      {novedades.length > 0 && (
        <Page size="A4" style={S.page}>
          <Header section={sourceLabels.novedades} now={now} />
          <Footer />
          <SectionTitle kicker="NOVEDADES" title={sourceLabels.novedades} />
          <View style={S.cardList}>
            {novedades.map((item, index) => (
              <RecordCard
                key={item.id || index}
                title={item.title}
                meta={dateTimeText(item.created_at || item.createdAt)}
                body={`${text(item.content)}\nAUTOR: ${text(item.authorName, 'SISTEMA')}`}
              />
            ))}
          </View>
        </Page>
      )}

      {personal.length > 0 && (
        <Page size="A4" style={S.page}>
          <Header section={sourceLabels.personal} now={now} />
          <Footer />
          <SectionTitle kicker="FUERZA" title={sourceLabels.personal} />
          <DataTable columns={personalColumns} rows={personal} />
        </Page>
      )}
    </Document>
  );
}
