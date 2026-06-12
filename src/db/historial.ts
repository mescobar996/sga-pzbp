import { supabase } from './client';

export async function getConsolidatedHistory(locationId: string) {
  // Ahora consultamos directamente la vista optimizada en Postgres
  const { data, error } = await supabase
    .from('vw_location_history')
    .select('*')
    .eq('location_id', locationId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching history:', error);
    throw error;
  }

  return data || [];
}
