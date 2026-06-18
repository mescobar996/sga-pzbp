import { supabase } from './client';

export type HistorialItem = {
  id: string;
  type: 'VISITA' | 'TAREA' | 'NOVEDAD' | 'DILIGENCIA';
  title: string;
  description: string;
  author_name: string;
  created_at: string;
};

/**
 * Resuelve el location_id a partir del nombre de la ubicación.
 * Solo se usa para el script de diagnóstico (el historial real no depende de él).
 */
export async function resolveLocationId(locationName: string): Promise<string | null> {
  const { data: exact, error: exactError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName.trim())
    .maybeSingle();

  if (!exactError && exact?.id) return exact.id;

  const { data: fuzzy, error: fuzzyError } = await supabase
    .from('locations')
    .select('id')
    .ilike('name', locationName.trim())
    .limit(1);

  if (fuzzyError || !fuzzy?.length) {
    console.warn('[historial] resolveLocationId: no encontrado para', locationName);
    return null;
  }
  return fuzzy[0].id;
}

/**
 * Consolida el historial de los 4 sectores operativos para una ubicación.
 *
 * ESTRATEGIA REAL (basada en el esquema de DB):
 *  - VISITAS:          filtradas donde origen OR destino coincide con locationName (ilike)
 *  - TAREAS:           globales (la tabla tasks no tiene campo de ubicación en el esquema)
 *  - NOVEDADES:        globales (la tabla novedades no tiene location_id)
 *  - DILIGENCIAMIENTOS: globales (la tabla diligenciamientos no tiene location_id)
 *
 * Las 4 consultas corren en paralelo y el resultado se ordena por created_at desc.
 */
export async function getConsolidatedHistory(locationName: string): Promise<HistorialItem[]> {
  if (!locationName?.trim()) return [];

  const name = locationName.trim();

  const [visitasRes, tareasRes, novedadesRes, diligRes] = await Promise.all([
    // VISITAS: origen o destino contiene el nombre de la ubicación
    supabase
      .from('visitas')
      .select('id, origen, destino, observaciones, responsable, created_at')
      .or(`origen.ilike.%${name}%,destino.ilike.%${name}%`)
      .order('created_at', { ascending: false })
      .limit(1000),

    // TAREAS: globales (sin filtro de ubicación — no existe el campo)
    supabase
      .from('tasks')
      .select('id, title, description, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),

    // NOVEDADES: globales
    supabase
      .from('novedades')
      .select('id, title, content, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),

    // DILIGENCIAMIENTOS: globales
    supabase
      .from('diligenciamientos')
      .select('id, title, content, author_name, created_at')
      .order('created_at', { ascending: false })
      .limit(1000),
  ]);

  if (visitasRes.error)  console.error('[historial] visitas error:',          visitasRes.error);
  if (tareasRes.error)   console.error('[historial] tasks error:',             tareasRes.error);
  if (novedadesRes.error)console.error('[historial] novedades error:',         novedadesRes.error);
  if (diligRes.error)    console.error('[historial] diligenciamientos error:', diligRes.error);

  const visitas: HistorialItem[] = (visitasRes.data ?? []).map(v => ({
    id:          v.id,
    type:        'VISITA',
    title:       `${v.origen} → ${v.destino}`,
    description: v.observaciones || `Responsable: ${v.responsable || '—'}`,
    author_name: v.responsable || '',
    created_at:  v.created_at,
  }));

  const tareas: HistorialItem[] = (tareasRes.data ?? []).map(t => ({
    id:          t.id,
    type:        'TAREA',
    title:       t.title,
    description: t.description || '',
    author_name: '',
    created_at:  t.created_at,
  }));

  const novedades: HistorialItem[] = (novedadesRes.data ?? []).map(n => ({
    id:          n.id,
    type:        'NOVEDAD',
    title:       n.title,
    description: n.content || '',
    author_name: n.author_name || '',
    created_at:  n.created_at,
  }));

  const diligencias: HistorialItem[] = (diligRes.data ?? []).map(d => ({
    id:          d.id,
    type:        'DILIGENCIA',
    title:       d.title,
    description: d.content || '',
    author_name: d.author_name || '',
    created_at:  d.created_at,
  }));

  const all = [...visitas, ...tareas, ...novedades, ...diligencias];
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  console.info(
    `[historial] ${name} → VISITAS:${visitas.length} TAREAS:${tareas.length} NOVEDADES:${novedades.length} DILIGENCIAS:${diligencias.length} TOTAL:${all.length}`
  );

  return all;
}

