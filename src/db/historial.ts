import { supabase } from './client';

export async function getConsolidatedHistory(locationName: string) {
  if (!locationName?.trim()) return [];

  // 1. Buscar UUID por nombre exacto (case-sensitive primero)
  let locationId: string | null = null;

  const { data: exact, error: exactError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName.trim())
    .maybeSingle();

  if (!exactError && exact?.id) {
    locationId = exact.id;
  } else {
    // Fallback: búsqueda case-insensitive con ilike
    const { data: fuzzy, error: fuzzyError } = await supabase
      .from('locations')
      .select('id, name')
      .ilike('name', locationName.trim())
      .limit(1);

    if (fuzzyError) {
      console.error('[historial] Error buscando ubicación (ilike):', fuzzyError);
      return [];
    }
    if (!fuzzy || fuzzy.length === 0) {
      console.warn('[historial] Ubicación no encontrada en locations:', locationName);
      return [];
    }
    locationId = fuzzy[0].id;
  }

  // 2. Consulta a la vista filtrando ESTRICTAMENTE por location_id
  const { data, error } = await supabase
    .from('vw_location_history')
    .select('id, type, title, description, author_name, created_at, location_id')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[historial] Error fetching vw_location_history:', error);
    throw error;
  }

  return data ?? [];
}
