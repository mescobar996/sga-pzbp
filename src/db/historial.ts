import { supabase } from './client';

export async function getConsolidatedHistory(locationName?: string) {
  let query = supabase
    .from('vw_location_history')
    .select('*')
    .order('created_at', { ascending: false });

  if (locationName && locationName !== 'TODOS') {
    const { data: location, error: locError } = await supabase
      .from('locations')
      .select('id')
      .eq('name', locationName)
      .single();

    if (!locError && location) {
      // Filtramos: records con ese ID OR records sin ubicación (location_id IS NULL)
      query = query.or(`location_id.eq.${location.id},location_id.is.null`);
    } else {
      // Si no existe, solo traemos los globales (huérfanos)
      query = query.is('location_id', null);
    }
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching history:', error);
    throw error;
  }

  return data || [];
}
