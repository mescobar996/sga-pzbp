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

function cleanCellString(val: any): string {
  if (val === undefined || val === null) return '';
  if (typeof val === 'number' && isNaN(val)) return '';
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (lower === 'nan' || lower === 'undefined' || lower === 'null') return '';
  return str;
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
      const destinoVal = cleanCellString(destinoIdx !== -1 ? row[destinoIdx] : '');
      const ubicacionVal = cleanCellString(ubicacionIdx !== -1 ? row[ubicacionIdx] : '');
      const idP25Val = cleanCellString(idP25Idx !== -1 ? row[idP25Idx] : '');
      const idGebipaVal = cleanCellString(idGebipaIdx !== -1 ? row[idGebipaIdx] : '');
      const inventarioVal = cleanCellString(inventarioIdx !== -1 ? row[inventarioIdx] : '');
      
      let nroSerie = cleanCellString(nroSerieIdx !== -1 ? row[nroSerieIdx] : '');
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

      const modeloVal = cleanCellString(modeloIdx !== -1 ? row[modeloIdx] : '');
      const caracteristicaVal = cleanCellString(caracteristicaIdx !== -1 ? row[caracteristicaIdx] : '');
      const accesoriosVal = cleanCellString(accesoriosIdx !== -1 ? row[accesoriosIdx] : '');
      const estadoVal = cleanCellString(estadoIdx !== -1 ? row[estadoIdx] : '');
      const observacionesVal = cleanCellString(observacionesIdx !== -1 ? row[observacionesIdx] : '');

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

export interface ExcelLinea106Row {
  location_id?: string;
  destinatario_sigla: string;
  grabadora_audio?: string | null;
  vhf_conectado?: string | null;
  grabacion_vhf?: string | null;
  observaciones_vhf?: string | null;
  telefono_analogico?: string | null;
  grabacion_106?: string | null;
  adaptador_divisor?: string | null;
  adaptador_macho_hembra?: string | null;
  observaciones_linea_106?: string | null;
}

function cleanBooleanString(val: any): string {
  if (val === undefined || val === null) return 'NO';
  if (typeof val === 'boolean') {
    return val ? 'SI' : 'NO';
  }
  const str = String(val).trim().toUpperCase();
  if (str === 'TRUE' || str === 'SI' || str === 'S' || str === '1' || str === 'OK') return 'SI';
  if (str === 'FALSE' || str === 'NO' || str === 'N' || str === '0') return 'NO';
  return str || 'NO';
}

export function parseLinea106Excel(
  fileBuffer: ArrayBuffer,
  locations: { id: string; name: string; code?: string }[]
): ExcelLinea106Row[] {
  const workbook = XLSX.read(fileBuffer, { type: 'array' });
  const records: ExcelLinea106Row[] = [];

  const nameMap = new Map(locations.map((l) => [l.name.toLowerCase().trim(), l]));
  const codeMap = new Map(locations.map((l) => [l.code?.toLowerCase().trim() || '', l]));

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

    if (rows.length <= 5) continue;

    // Search header row containing 'DPCIA' or 'DEPENDENCIA'
    let headerIdx = -1;
    for (let i = 0; i < Math.min(rows.length, 15); i++) {
      const row = rows[i];
      if (Array.isArray(row)) {
        const hasDpcia = row.some((cell) => {
          const str = String(cell || '').toLowerCase();
          return str.includes('dpcia') || str.includes('destino') || str.includes('depend');
        });
        if (hasDpcia) {
          headerIdx = i;
          break;
        }
      }
    }

    if (headerIdx === -1) {
      headerIdx = 5; // default fallback (row 6)
    }

    const headers = (rows[headerIdx] || []).map((h: any) => String(h || '').trim().toUpperCase());

    const getColIndex = (keywords: string[]) => {
      return headers.findIndex((h) => keywords.some((keyword) => h.includes(keyword)));
    };

    const dpciaIdx = getColIndex(['DPCIA', 'DESTINO', 'DEPENDENCIA', 'UNIDAD']);
    const grabadoraIdx = getColIndex(['GRABADORA DE AUDIO', 'GRABADORA', 'AUDIO']);
    const vhfConectadoIdx = getColIndex(['VHF CONECTADO', 'VHF CONECTA', 'EQUIPO VHF', 'CONECTADO VHF']);
    const grabacionVhfIdx = getColIndex(['GRABACION VHF', 'GRABACIÓN VHF', 'GRAB. VHF']);
    const obsVhfIdx = getColIndex(['OBSERVACIONES VHF', 'OBS. VHF']);
    const telAnalogicoIdx = getColIndex(['TELEFONO ANALOGICO', 'TELÉFONO ANALÓGICO', 'TELEFONO', 'TEL. ANALOGICO']);
    const grabacion106Idx = getColIndex(['GRABACION 106', 'GRABACIÓN 106', '106']);
    const divisorIdx = getColIndex(['ADAPTADOR DIVISOR', 'DIVISOR', 'ADAP. DIVISOR']);
    const machoHembraIdx = getColIndex(['MACHO/HEMBRA', 'MACHO HEMBRA', 'CONECTOR MACHO', 'CONECTOR HEMBRA']);
    const obs106Idx = getColIndex(['OBSERVACIONES LINEA 106', 'OBSERVACIONES LÍNEA 106', 'OBS. 106', 'OBSERVACIONES 106']);

    let currentSigla = '';

    for (let i = headerIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      if (!Array.isArray(row) || row.length === 0) continue;

      // Check if DPCIA cell is valid
      const rawDpcia = dpciaIdx !== -1 ? row[dpciaIdx] : null;
      const dpciaVal = cleanCellString(rawDpcia);

      if (dpciaVal) {
        currentSigla = dpciaVal;
      }

      // If sigla is still empty, fallback to currentSigla or sheetName
      const finalSiglaStr = currentSigla || sheetName || 'N/A';

      // Parse other fields
      const grabadoraVal = cleanCellString(grabadoraIdx !== -1 ? row[grabadoraIdx] : '');
      const vhfConectadoVal = cleanBooleanString(vhfConectadoIdx !== -1 ? row[vhfConectadoIdx] : '');
      const grabacionVhfVal = cleanBooleanString(grabacionVhfIdx !== -1 ? row[grabacionVhfIdx] : '');
      const obsVhfVal = cleanCellString(obsVhfIdx !== -1 ? row[obsVhfIdx] : '');
      const telAnalogicoVal = cleanBooleanString(telAnalogicoIdx !== -1 ? row[telAnalogicoIdx] : '');
      const grabacion106Val = cleanBooleanString(grabacion106Idx !== -1 ? row[grabacion106Idx] : '');
      const divisorVal = cleanBooleanString(divisorIdx !== -1 ? row[divisorIdx] : '');
      const machoHembraVal = cleanBooleanString(machoHembraIdx !== -1 ? row[machoHembraIdx] : '');
      const obs106Val = cleanCellString(obs106Idx !== -1 ? row[obs106Idx] : '');

      // Skip rows that are completely empty
      if (
        !grabadoraVal &&
        !obsVhfVal &&
        !obs106Val &&
        vhfConectadoVal === 'NO' &&
        grabacionVhfVal === 'NO' &&
        telAnalogicoVal === 'NO' &&
        grabacion106Val === 'NO' &&
        divisorVal === 'NO' &&
        machoHembraVal === 'NO'
      ) {
        continue;
      }

      // Resolve location
      let resolvedLoc = nameMap.get(finalSiglaStr.toLowerCase()) || codeMap.get(finalSiglaStr.toLowerCase());
      if (!resolvedLoc) {
        resolvedLoc = nameMap.get(sheetName.toLowerCase()) || codeMap.get(sheetName.toLowerCase());
      }

      const sigla = resolvedLoc?.code || finalSiglaStr;

      records.push({
        location_id: resolvedLoc?.id || undefined,
        destinatario_sigla: sigla.substring(0, 10).toUpperCase(),
        grabadora_audio: grabadoraVal || null,
        vhf_conectado: vhfConectadoVal,
        grabacion_vhf: grabacionVhfVal,
        observaciones_vhf: obsVhfVal || null,
        telefono_analogico: telAnalogicoVal,
        grabacion_106: grabacion106Val,
        adaptador_divisor: divisorVal,
        adaptador_macho_hembra: machoHembraVal,
        observaciones_linea_106: obs106Val || null,
      });
    }
  }

  return records;
}
