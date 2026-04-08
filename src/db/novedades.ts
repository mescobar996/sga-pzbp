import { supabase, getCurrentUserId, supabase as client } from './client';
import type { Novedad } from '../types';

export interface NovedadAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

function mapNovedad(row: Record<string, any>): Novedad {
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

export async function getNovedades(): Promise<Novedad[]> {
  const { data, error } = await supabase.from('novedades').select('*').order('created_at', { ascending: false }).limit(200);
  if (error) throw error;
  return data.map(mapNovedad);
}

export async function addNovedad(novedad: {
  title: string;
  content: string;
  fecha?: string;
  attachments?: NovedadAttachment[];
}): Promise<void> {
  const userId = getCurrentUserId();
  const { data: userData } = await supabase.from('users').select('name, email').eq('id', userId).single();
  const authorName = userData?.name || userData?.email || 'Usuario';

  const { error } = await supabase.from('novedades').insert({
    title: novedad.title,
    content: novedad.content,
    fecha: novedad.fecha || new Date().toISOString().split('T')[0],
    author_id: userId,
    author_name: authorName,
    attachments: novedad.attachments || [],
  });
  if (error) throw error;
}

export async function updateNovedad(id: string, updates: Partial<Novedad>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.content !== undefined) mapped.content = updates.content;
  if (updates.fecha !== undefined) mapped.fecha = updates.fecha;
  if (updates.attachments !== undefined) mapped.attachments = updates.attachments;

  const { error } = await supabase.from('novedades').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteNovedad(id: string): Promise<void> {
  const { error } = await supabase.from('novedades').delete().eq('id', id);
  if (error) throw error;
}

// Storage helpers
export async function uploadNovedadAttachment(file: File, userId: string): Promise<{ name: string; url: string; type: string; size: number }> {
  const sanitizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${sanitizedName}`;
  const path = `novedades/${userId}/${fileName}`;
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

export function onNovedadesChange(callback: (novedades: Novedad[]) => void): () => void {
  getNovedades().then(callback).catch((err) => {
    console.error('[onNovedadesChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('novedades-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'novedades' },
      () => {
        getNovedades().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
