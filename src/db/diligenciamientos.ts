import { supabase, getCurrentUserId } from './client';
import type { Diligenciamiento } from '../types';

export interface DiligenciamientoAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

function mapDiligenciamiento(row: Record<string, any>): Diligenciamiento {
  return {
    id: row.id,
    title: row.title,
    content: row.content || '',
    fecha: row.fecha || '',
    createdAt: row.created_at || '',
    authorId: row.author_id || '',
    authorName: row.author_name || '',
    attachments: (row.attachments || []) as any,
  };
}

export async function getDiligenciamientos(): Promise<Diligenciamiento[]> {
  const { data, error } = await supabase.from('diligenciamientos').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data.map(mapDiligenciamiento);
}

export async function addDiligenciamiento(diligenciamiento: {
  title: string;
  content: string;
  fecha?: string;
  attachments?: DiligenciamientoAttachment[];
}): Promise<void> {
  const userId = getCurrentUserId();
  const { data: userData } = await supabase.from('users').select('name, email').eq('id', userId).single();
  const authorName = userData?.name || userData?.email || 'Usuario';

  const { error } = await supabase.from('diligenciamientos').insert({
    title: diligenciamiento.title,
    content: diligenciamiento.content,
    fecha: diligenciamiento.fecha || null,
    author_id: userId,
    author_name: authorName,
    attachments: diligenciamiento.attachments || [],
  });
  if (error) throw error;
}

export async function updateDiligenciamiento(id: string, updates: Partial<Diligenciamiento>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.content !== undefined) mapped.content = updates.content;
  if (updates.fecha !== undefined) mapped.fecha = updates.fecha;
  if (updates.attachments !== undefined) mapped.attachments = updates.attachments;

  const { error } = await supabase.from('diligenciamientos').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteDiligenciamiento(id: string): Promise<void> {
  const { error } = await supabase.from('diligenciamientos').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDiligenciamientoAttachment(file: File, userId: string): Promise<{ name: string; url: string; type: string; size: number }> {
  const fileName = `${Date.now()}_${file.name}`;
  const path = `diligenciamientos/${userId}/${fileName}`;
  const { error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from('attachments').getPublicUrl(path);
  return {
    name: file.name,
    url: data.publicUrl,
    type: file.type,
    size: file.size,
  };
}

export async function deleteAttachment(path: string): Promise<void> {
  try {
    await supabase.storage.from('attachments').remove([path]);
  } catch (e) {
    console.error('Error deleting attachment:', e);
  }
}

export function onDiligenciamientosChange(callback: (diligenciamientos: Diligenciamiento[]) => void): () => void {
  getDiligenciamientos().then(callback).catch((err) => {
    console.error('[onDiligenciamientosChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('diligenciamientos-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'diligenciamientos' },
      () => {
        getDiligenciamientos().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
