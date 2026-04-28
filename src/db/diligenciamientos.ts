import { supabase, getCurrentUserId } from './client';
import type { Diligenciamiento, DiligenciamientoCategory } from '../types';

export interface DiligenciamientoAttachment {
  name: string;
  url: string;
  type: string;
  size?: number;
}

// Categorías Dinámicas
export async function getCategories(): Promise<DiligenciamientoCategory[]> {
  try {
    const { data, error } = await supabase
      .from('diligenciamiento_categories')
      .select('*')
      .order('name', { ascending: true });
    
    if (error) {
      // 42P01 is PostgreSql error for "relation does not exist"
      if (error.code === '42P01' || error.status === 404) {
        console.warn('[DB] Tabla diligenciamiento_categories no encontrada. Usando valores por defecto.');
        return [];
      }
      throw error;
    }
    
    return (data || []).map(row => ({
      id: row.id,
      name: row.name,
      icon: row.icon || 'Layout',
      color: row.color || 'bg-[#1a1a1a]',
      createdAt: row.created_at,
      authorId: row.author_id,
    }));
  } catch (err) {
    console.error('[DB] Error cargando categorías:', err);
    return [];
  }
}

export async function addCategory(category: { name: string; icon?: string; color?: string }): Promise<void> {
  const userId = getCurrentUserId();
  const { error } = await supabase.from('diligenciamiento_categories').insert({
    name: category.name,
    icon: category.icon || 'Layout',
    color: category.color || 'bg-[#1a1a1a]',
    author_id: userId,
  });
  if (error) throw error;
}

export async function updateCategory(id: string, updates: Partial<DiligenciamientoCategory>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.icon !== undefined) mapped.icon = updates.icon;
  if (updates.color !== undefined) mapped.color = updates.color;

  const { error } = await supabase.from('diligenciamiento_categories').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('diligenciamiento_categories').delete().eq('id', id);
  if (error) throw error;
}

export function onCategoriesChange(callback: (categories: DiligenciamientoCategory[]) => void): () => void {
  getCategories().then(callback);
  const channel = supabase
    .channel('categories-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'diligenciamiento_categories' },
      () => {
        getCategories().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

function mapDiligenciamiento(row: Record<string, any>): Diligenciamiento {
  return {
    id: row.id,
    title: row.title,
    content: row.content || '',
    category: row.category || '',
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
  category?: string;
  fecha?: string;
  attachments?: DiligenciamientoAttachment[];
}): Promise<void> {
  const userId = getCurrentUserId();
  const { data: userData } = await supabase.from('users').select('name, email').eq('id', userId).single();
  const authorName = userData?.name || userData?.email || 'Usuario';

  const { error } = await supabase.from('diligenciamientos').insert({
    title: diligenciamiento.title,
    content: diligenciamiento.content,
    category: diligenciamiento.category || 'OTROS',
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
  if (updates.category !== undefined) mapped.category = updates.category;
  if (updates.fecha !== undefined) mapped.fecha = updates.fecha || null;
  if (updates.attachments !== undefined) mapped.attachments = updates.attachments;

  const { error } = await supabase.from('diligenciamientos').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteDiligenciamiento(id: string): Promise<void> {
  const { error } = await supabase.from('diligenciamientos').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadDiligenciamientoAttachment(file: File, userId: string): Promise<{ name: string; url: string; type: string; size: number }> {
  const sanitizedName = file.name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const fileName = `${Date.now()}_${sanitizedName}`;
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
