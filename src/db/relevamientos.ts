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
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('NO HAY SESIÓN ACTIVA. POR FAVOR, INICIÁ SESIÓN NUEVAMENTE.');
  }

  const { error } = await supabase
    .from('relevamiento_baterias_p25')
    .upsert(payload, { onConflict: 'location_id' });

  if (error) throw error;
}

export interface RelevamientoEquipamientoRadioelectrico {
  id: string;
  location_id: string | null;
  destinatario_sigla: string;
  ubicacion_interna: string | null;
  id_p25: string | null;
  id_gebipa: string | null;
  inventario_gebipa: string | null;
  nro_serie: string;
  modelo: string;
  caracteristica_equipo: string | null;
  accesorios: string | null;
  estado: string;
  observaciones: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  locations?: {
    name: string;
  } | null;
}

export type RelevamientoEquipamientoRadioelectricoPayload = {
  id?: string;
  location_id?: string | null;
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
  author_name: string;
};

export async function getRelevamientoEquipamientoRadioelectrico(): Promise<RelevamientoEquipamientoRadioelectrico[]> {
  const { data, error } = await supabase
    .from('relevamiento_equipamiento_radioelectrico')
    .select(`
      *,
      locations:location_id (
        name
      )
    `)
    .order('destinatario_sigla', { ascending: true });

  if (error) throw error;
  return (data || []) as RelevamientoEquipamientoRadioelectrico[];
}

export async function upsertRelevamientoEquipamientoRadioelectrico(
  payload: RelevamientoEquipamientoRadioelectricoPayload
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('NO HAY SESIÓN ACTIVA. POR FAVOR, INICIÁ SESIÓN NUEVAMENTE.');
  }

  const { error } = await supabase
    .from('relevamiento_equipamiento_radioelectrico')
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;
}

export async function insertRelevamientoEquipamientoRadioelectricoBatch(
  records: RelevamientoEquipamientoRadioelectricoPayload[]
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('NO HAY SESIÓN ACTIVA. POR FAVOR, INICIÁ SESIÓN NUEVAMENTE.');
  }

  // Segment insertion in chunks of 100 to avoid request body size or DB limits
  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('relevamiento_equipamiento_radioelectrico')
      .insert(chunk);

    if (error) {
      console.error('Error inserting batch chunk:', error);
      throw error;
    }
  }
}

export interface RelevamientoLinea106 {
  id: string;
  location_id: string | null;
  destinatario_sigla: string;
  grabadora_audio: string | null;
  vhf_conectado: string | null;
  grabacion_vhf: string | null;
  observaciones_vhf: string | null;
  telefono_analogico: string | null;
  grabacion_106: string | null;
  adaptador_rj11_divisor: string | null;
  adaptador_rj11_macho_hembra: string | null;
  observaciones_106: string | null;
  created_at: string;
  updated_at: string;
  author_name: string;
  locations?: {
    name: string;
  } | null;
}

export type RelevamientoLinea106Payload = {
  id?: string;
  location_id?: string | null;
  destinatario_sigla: string;
  grabadora_audio?: string | null;
  vhf_conectado?: string | null;
  grabacion_vhf?: string | null;
  observaciones_vhf?: string | null;
  telefono_analogico?: string | null;
  grabacion_106?: string | null;
  adaptador_rj11_divisor?: string | null;
  adaptador_rj11_macho_hembra?: string | null;
  observaciones_106?: string | null;
  author_name: string;
};

export async function getRelevamientoLinea106(): Promise<RelevamientoLinea106[]> {
  const { data, error } = await supabase
    .from('relevamiento_linea_106')
    .select(`
      *,
      locations:location_id (
        name
      )
    `)
    .order('destinatario_sigla', { ascending: true });

  if (error) throw error;
  return (data || []) as RelevamientoLinea106[];
}

export async function upsertRelevamientoLinea106(
  payload: RelevamientoLinea106Payload
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('NO HAY SESIÓN ACTIVA. POR FAVOR, INICIÁ SESIÓN NUEVAMENTE.');
  }

  const { error } = await supabase
    .from('relevamiento_linea_106')
    .upsert(payload, { onConflict: 'id' });

  if (error) throw error;
}

export async function insertRelevamientoLinea106Batch(
  records: RelevamientoLinea106Payload[]
): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new Error('NO HAY SESIÓN ACTIVA. POR FAVOR, INICIÁ SESIÓN NUEVAMENTE.');
  }

  const chunkSize = 100;
  for (let i = 0; i < records.length; i += chunkSize) {
    const chunk = records.slice(i, i + chunkSize);
    const { error } = await supabase
      .from('relevamiento_linea_106')
      .insert(chunk);

    if (error) {
      console.error('Error inserting Linea 106 batch:', error);
      throw error;
    }
  }
}


