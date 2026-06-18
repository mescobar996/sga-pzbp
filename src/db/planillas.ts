import { supabase } from './client';

export interface RelevamientoBateriasP25 {
  id: string;
  location_id: string;
  destinatario_sigla: string;
  en_funcionamiento: number;
  fuera_de_servicio: number;
  observaciones: string | null;
  updated_at: string;
  author_name: string;
  locations?: {
    name: string;
  } | null;
}

export type RelevamientoBateriasP25Payload = {
  id?: string;
  location_id: string;
  destinatario_sigla: string;
  en_funcionamiento: number;
  fuera_de_servicio: number;
  observaciones?: string;
  author_name: string;
  updated_at?: string;
};

export async function getRelevamientoBateriasP25(): Promise<RelevamientoBateriasP25[]> {
  const { data, error } = await supabase
    .from('relevamiento_baterias_p25')
    .select(`
      *,
      locations:location_id (
        name
      )
    `)
    .order('destinatario_sigla', { ascending: true });

  if (error) throw error;
  return (data || []) as RelevamientoBateriasP25[];
}

export async function upsertRelevamientoBateriasP25(
  payload: RelevamientoBateriasP25Payload
): Promise<void> {
  const { error } = await supabase
    .from('relevamiento_baterias_p25')
    .upsert(payload, { onConflict: 'location_id' });

  if (error) throw error;
}
