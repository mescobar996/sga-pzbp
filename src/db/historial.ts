import { supabase } from './client';

export async function getConsolidatedHistory(locationName: string) {
  // 1. Primero, obtenemos el UUID de la ubicación basado en el nombre (código de 4 letras)
  const { data: location, error: locError } = await supabase
    .from('locations')
    .select('id')
    .eq('name', locationName)
    .single();

  if (locError || !location) {
    console.error('Error finding location or location not found:', locError);
    return []; // O lanzar error si prefieres
  }

  // 2. Ahora consultamos la vista usando el UUID obtenido
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
