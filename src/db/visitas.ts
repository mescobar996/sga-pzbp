import { supabase, getCurrentUserId } from './client';
import type { Visita, VisitaComment } from '../types';

export interface VisitaRow {
  id: string;
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  responsable: string;
  observaciones?: string;
  comments?: VisitaComment[];
  author_id: string;
  created_at: string;
}

function mapVisita(row: Record<string, any>): Visita {
  return {
    id: row.id,
    origen: row.origen,
    destino: row.destino,
    fecha: row.fecha,
    hora: row.hora || '',
    responsable: row.responsable || '',
    observaciones: row.observaciones || '',
    createdAt: row.created_at || '',
    authorId: row.author_id || '',
    comments: (row.comments || []) as VisitaComment[],
  };
}

export async function getVisitas(): Promise<Visita[]> {
  const { data, error } = await supabase.from('visitas').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data.map(mapVisita);
}

export async function addVisita(visita: Omit<Visita, 'id' | 'createdAt' | 'authorId'>): Promise<void> {
  const authorId = getCurrentUserId();
  const { error } = await supabase.from('visitas').insert({
    origen: visita.origen,
    destino: visita.destino,
    fecha: visita.fecha,
    hora: visita.hora,
    responsable: visita.responsable,
    observaciones: visita.observaciones || null,
    comments: visita.comments || [],
    author_id: authorId,
  });
  if (error) throw error;
}

export async function updateVisita(id: string, updates: Partial<Visita>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.origen !== undefined) mapped.origen = updates.origen;
  if (updates.destino !== undefined) mapped.destino = updates.destino;
  if (updates.fecha !== undefined) mapped.fecha = updates.fecha;
  if (updates.hora !== undefined) mapped.hora = updates.hora;
  if (updates.responsable !== undefined) mapped.responsable = updates.responsable;
  if (updates.observaciones !== undefined) mapped.observaciones = updates.observaciones;
  if (updates.comments !== undefined) mapped.comments = updates.comments;

  const { error } = await supabase.from('visitas').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteVisita(id: string): Promise<void> {
  const { error } = await supabase.from('visitas').delete().eq('id', id);
  if (error) throw error;
}

export function onVisitasChange(callback: (visitas: Visita[]) => void): () => void {
  getVisitas().then(callback).catch((err) => {
    console.error('[onVisitasChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('visitas-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'visitas' },
      () => {
        getVisitas().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
