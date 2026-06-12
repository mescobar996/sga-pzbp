import { supabase } from './client';

export async function getConsolidatedHistory(locationName: string) {
  // 1. Obtener UUID de ubicación
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName)
    .single();

  if (locError || !location) {
    console.error('Ubicación no encontrada:', locError);
    return [];
  }

  // 2. Consulta ESTRICTA usando la vista y filtrando solo por location_id
  const { data, error } = await supabase
    .from('vw_location_history')
    .select('*')
    .eq('location_id', location.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error);
    throw error;
  }

  return data || [];
}
