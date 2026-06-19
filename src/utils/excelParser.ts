import * as XLSX from 'xlsx';

export interface ExcelRadioRow {
  location_id?: string;
  destinatario_sigla: string;
  ubicacion_interna?: string | null;
  id_p25?: string | null;
  id_gebipa?: string | null;
  inventario_gebipa?: string | null;
  nro_serie: string;
  modelo: string;
  caracteristica_equipo?: string | null;
  accesorios?: string | null;
  estado: string;
  observaciones?: string | null;
}

/**
 * Parses all sheets of a radio equipment Excel file.
 * Skips the first 6 metadata/header lines and finds the column headers.
 */
export function parseRadioExcel(
  fileBuffer: ArrayBuffer,
  locations: { id: string; name: string; code?: string }[]
): ExcelRadioRow[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const records: ExcelRadioRow[] = [];

  // Create lookups to match against locations
  const nameMap = new Map(locations.map((l) => [l.name.toLowerCase().trim(), l]));
  const codeMap = new Map(locations.map((l) => [l.code?.toLowerCase().trim() || '', l]));
  const seenSerialNumbers = new Set<string>();

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    // Convert to row arrays
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (rows.length <= 6) continue;

    // Search for header row in the first 15 rows
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (Array.isArray(row)) {
        const hasOrder = row.some((cell) => {
          const str = String(cell || '').toLowerCase();
          return str.includes('orden') || str.includes('n°') || str.includes('nro');
        });
        if (hasOrder) {
          headerIdx = i;
          break;
        }
      }
    }

    if (headerIdx === -1) {
      headerIdx = 6; // default fallback
    }

    const headers = (rows[headerIdx] || []).map((h: any) => String(h || '').trim().toUpperCase());

    // Helper to find column index matching keywords
    const getColIndex = (keywords: string[]) => {
      return headers.findIndex((h) => keywords.some((keyword) => h.includes(keyword)));
    };

    const ordenIdx = getColIndex(['ORDEN', 'N°', 'NRO']);
    const destinoIdx = getColIndex(['DESTINO', 'DEPENDENCIA', 'UNIDAD']);
    const ubicacionIdx = getColIndex(['UBICACIÓN', 'UBICACION', 'LUGAR', 'INTERNA']);
    const idP25Idx = getColIndex(['ID P25', 'P25', 'ID']);
    const idGebipaIdx = getColIndex(['ID GEBIPA', 'GEBIPA ID']);
    const inventarioIdx = getColIndex(['INVENTARIO', 'INV']);
    const nroSerieIdx = getColIndex(['SERIE', 'NRO. SERIE', 'NRO SERIE', 'S/N', 'SN']);
    const modeloIdx = getColIndex(['MODELO', 'EQUIPO']);
    const caracteristicaIdx = getColIndex(['CARACTERISTICA', 'CARACTERÍSTICA', 'TIPO']);
    const accesoriosIdx = getColIndex(['ACCESORIOS', 'ACCESORIO']);
    const estadoIdx = getColIndex(['ESTADO', 'SITUACION', 'SITUACIÓN']);
    const observacionesIdx = getColIndex(['OBSERVACIONES', 'OBSERVACION', 'OBS']);

    // Parse data rows
    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      const ordenVal = ordenIdx !== -1 ? row[ordenIdx] : null;
      if (ordenVal === undefined || ordenVal === null) continue;

      const ordenStr = String(ordenVal).trim();
      // Skip if order column is not a valid number
      if (!ordenStr || isNaN(Number(ordenStr))) {
        continue;
      }

      // Extract values safely
      const destinoVal = String(destinoIdx !== -1 && row[destinoIdx] !== undefined ? row[destinoIdx] : '').trim();
      const ubicacionVal = String(ubicacionIdx !== -1 && row[ubicacionIdx] !== undefined ? row[ubicacionIdx] : '').trim();
      const idP25Val = String(idP25Idx !== -1 && row[idP25Idx] !== undefined ? row[idP25Idx] : '').trim();
      const idGebipaVal = String(idGebipaIdx !== -1 && row[idGebipaIdx] !== undefined ? row[idGebipaIdx] : '').trim();
      const inventarioVal = String(inventarioIdx !== -1 && row[inventarioIdx] !== undefined ? row[inventarioIdx] : '').trim();
      
      let nroSerie = String(nroSerieIdx !== -1 && row[nroSerieIdx] !== undefined ? row[nroSerieIdx] : '').trim();
      const upperSerie = nroSerie.toUpperCase();
      const isMissing = !nroSerie || upperSerie === 'NIL' || upperSerie === 'S/N' || upperSerie === 'SN' || upperSerie === 'SIN SERIE' || upperSerie === '—' || upperSerie === '-';
      
      if (isMissing) {
        // Generate a unique fallback to satisfy SQL UNIQUE constraint
        nroSerie = `S/N-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
      } else {
        const normalized = nroSerie.toLowerCase();
        if (seenSerialNumbers.has(normalized)) {
          continue; // skip duplicate row to prevent Supabase SQL UNIQUE constraint crash
        }
        seenSerialNumbers.add(normalized);
      }

      const modeloVal = String(modeloIdx !== -1 && row[modeloIdx] !== undefined ? row[modeloIdx] : '').trim();
      const caracteristicaVal = String(caracteristicaIdx !== -1 && row[caracteristicaIdx] !== undefined ? row[caracteristicaIdx] : '').trim();
      const accesoriosVal = String(accesoriosIdx !== -1 && row[accesoriosIdx] !== undefined ? row[accesoriosIdx] : '').trim();
      const estadoVal = String(estadoIdx !== -1 && row[estadoIdx] !== undefined ? row[estadoIdx] : '').trim();
      const observacionesVal = String(observacionesIdx !== -1 && row[observacionesIdx] !== undefined ? row[observacionesIdx] : '').trim();

      // Skip rows that lack actual device info
      if (!modeloVal && isMissing) continue;

      // Resolve location match
      let resolvedLoc = nameMap.get(destinoVal.toLowerCase()) || codeMap.get(destinoVal.toLowerCase());
      if (!resolvedLoc) {
        resolvedLoc = nameMap.get(sheetName.toLowerCase()) || codeMap.get(sheetName.toLowerCase());
      }

      const sigla = resolvedLoc?.code || destinoVal || sheetName || 'N/A';

      records.push({
        location_id: resolvedLoc?.id || undefined,
        destinatario_sigla: sigla.substring(0, 10).toUpperCase(),
        ubicacion_interna: ubicacionVal || null,
        id_p25: idP25Val || null,
        id_gebipa: idGebipaVal || null,
        inventario_gebipa: inventarioVal || null,
        nro_serie: nroSerie,
        modelo: modeloVal || 'DESCONOCIDO',
        caracteristica_equipo: caracteristicaVal || null,
        accesorios: accesoriosVal || null,
        estado: (estadoVal || 'OPERATIVO').toUpperCase(),
        observaciones: observacionesVal || null,
      });
    }
  }

  return records;
}
