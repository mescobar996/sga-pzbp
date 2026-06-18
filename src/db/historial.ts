import { supabase } from './client';

// Límite por página para paginación manual — PostgREST default: 1000 filas
const PAGE_SIZE = 1000;

/**
 * Resuelve el location_id a partir del nombre (cuatrigrama).
 * Exportado para ser reutilizado por el diagnóstico.
 */
export async function resolveLocationId(locationName: string): Promise<string | null> {
  const { data: exact, error: exactError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName.trim())
    .maybeSingle();

  if (!exactError && exact?.id) return exact.id;

  // Fallback case-insensitive
  const { data: fuzzy, error: fuzzyError } = await supabase
    .from('locations')
    .select('id, name')
    .ilike('name', locationName.trim())
    .limit(1);

  if (fuzzyError || !fuzzy || fuzzy.length === 0) {
    console.warn('[historial] Ubicación no encontrada:', locationName, fuzzyError);
    return null;
  }
  return fuzzy[0].id;
}

/**
 * Trae TODOS los registros de vw_location_history para una ubicación,
 * paginando en bloques de PAGE_SIZE para evitar el límite de 1000 filas
 * que PostgREST/Supabase aplica por defecto.
 */
export async function getConsolidatedHistory(locationName: string) {
  if (!locationName?.trim()) return [];

  const locationId = await resolveLocationId(locationName);
  if (!locationId) return [];

  const allRows: Record<string, unknown>[] = [];
  let from = 0;

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { data, error } = await supabase
      .from('vw_location_history')
      .select('id, type, title, description, author_name, created_at, location_id')
      .eq('location_id', locationId)
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      console.error(`[historial] Error en página ${from}–${from + PAGE_SIZE - 1}:`, error);
      throw error;
    }

    if (!data || data.length === 0) break;

    allRows.push(...data);

    // Si la página vino incompleta, llegamos al final
    if (data.length < PAGE_SIZE) break;

    from += PAGE_SIZE;
  }

  console.info(`[historial] ${locationName} → ${allRows.length} registros totales (${Math.ceil(allRows.length / PAGE_SIZE)} página/s)`);
  return allRows;
}
