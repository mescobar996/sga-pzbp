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
 */
export async function resolveLocationId(locationName: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName.trim())
    .maybeSingle();

  if (error || !data?.id) {
    return null;
  }
  return data.id;
}

/**
 * Consolida el historial de los 4 sectores operativos para una ubicación.
 *
 * LÓGICA:
 * - Si locationName es 'TODOS' o no existe: Trae TODO de vw_location_history y TODO de visitas.
 * - Si locationName es específico (ej. 'ROSA'):
 *   1. Busca el id (UUID) en la tabla locations donde name === locationName.
 *   2. Si existe, hace fetch a vw_location_history filtrando por location_id.
 *   3. Hace fetch a visitas donde origen o destino contienen locationName (ilike).
 *   4. Combina, formatea a HistorialItem, ordena desc.
 */
export async function getConsolidatedHistory(locationName: string): Promise<HistorialItem[]> {
  const name = locationName?.trim() || '';

  if (name === 'TODOS' || !name) {
    const [vistaRes, visitasRes] = await Promise.all([
      supabase
        .from('vw_location_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(2000),
      supabase
        .from('visitas')
        .select('id, origen, destino, observaciones, responsable, created_at')
        .order('created_at', { ascending: false })
        .limit(2000),
    ]);

    if (vistaRes.error) console.error('[historial] vw_location_history error:', vistaRes.error);
    if (visitasRes.error) console.error('[historial] visitas error:', visitasRes.error);

    const vistaItems: HistorialItem[] = (vistaRes.data ?? []).map(item => ({
      id:          item.id,
      type:        item.type,
      title:       item.title || '',
      description: item.description || '',
      author_name: item.author_name || '',
      created_at:  item.created_at,
    }));

    const visitas: HistorialItem[] = (visitasRes.data ?? []).map(v => ({
      id:          v.id,
      type:        'VISITA',
      title:       `${v.origen} → ${v.destino}`,
      description: v.observaciones || `Responsable: ${v.responsable || '—'}`,
      author_name: v.responsable || '',
      created_at:  v.created_at,
    }));

    const all = [...vistaItems, ...visitas];
    all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return all;
  }

  // Busca el id (UUID) en la tabla locations donde name === locationName.
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', name)
    .maybeSingle();

  if (locError) {
    console.error('[historial] locations fetch error:', locError);
  }

  if (!location?.id) {
    console.warn(`[historial] no location found for name: ${name}`);
    const { data: visitasRes, error: visitasError } = await supabase
      .from('visitas')
      .select('id, origen, destino, observaciones, responsable, created_at')
      .or(`origen.ilike.%${name}%,destino.ilike.%${name}%`)
      .order('created_at', { ascending: false })
      .limit(2000);

    if (visitasError) console.error('[historial] visitas error:', visitasError);

    const visitas: HistorialItem[] = (visitasRes ?? []).map(v => ({
      id:          v.id,
      type:        'VISITA',
      title:       `${v.origen} → ${v.destino}`,
      description: v.observaciones || `Responsable: ${v.responsable || '—'}`,
      author_name: v.responsable || '',
      created_at:  v.created_at,
    }));

    visitas.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return visitas;
  }

  // Haz un fetch a vw_location_history filtrando ESTRICTAMENTE por .eq('location_id', location.id).
  // Haz un fetch a visitas filtrando donde origen o destino contengan locationName (con ilike).
  const [vistaRes, visitasRes] = await Promise.all([
    supabase
      .from('vw_location_history')
      .select('*')
      .eq('location_id', location.id)
      .order('created_at', { ascending: false })
      .limit(2000),
    supabase
      .from('visitas')
      .select('id, origen, destino, observaciones, responsable, created_at')
      .or(`origen.ilike.%${name}%,destino.ilike.%${name}%`)
      .order('created_at', { ascending: false })
      .limit(2000),
  ]);

  if (vistaRes.error) console.error('[historial] vw_location_history error:', vistaRes.error);
  if (visitasRes.error) console.error('[historial] visitas error:', visitasRes.error);

  const vistaItems: HistorialItem[] = (vistaRes.data ?? []).map(item => ({
    id:          item.id,
    type:        item.type,
    title:       item.title || '',
    description: item.description || '',
    author_name: item.author_name || '',
    created_at:  item.created_at,
  }));

  const visitas: HistorialItem[] = (visitasRes.data ?? []).map(v => ({
    id:          v.id,
    type:        'VISITA',
    title:       `${v.origen} → ${v.destino}`,
    description: v.observaciones || `Responsable: ${v.responsable || '—'}`,
    author_name: v.responsable || '',
    created_at:  v.created_at,
  }));

  const all = [...vistaItems, ...visitas];
  all.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return all;
}
