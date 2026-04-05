import { supabase, getCurrentUserId } from './client';
import type { Personal } from '../types';

function mapPersonal(row: Record<string, any>): Personal {
  return {
    id: row.id,
    name: row.name,
    role: row.role || '',
    status: row.status || 'Activo',
    createdAt: row.created_at || '',
    authorId: row.author_id || '',
  };
}

export async function getPersonal(): Promise<Personal[]> {
  const { data, error } = await supabase.from('personal').select('*').order('name');
  if (error) throw error;
  return data.map(mapPersonal);
}

export async function addPersonal(item: { name: string; role: string; status: 'Activo' | 'Inactivo' }): Promise<void> {
  const authorId = getCurrentUserId();
  const { error } = await supabase.from('personal').insert({
    name: item.name,
    role: item.role,
    status: item.status,
    author_id: authorId,
  });
  if (error) throw error;
}

export async function updatePersonal(id: string, updates: Partial<Personal>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.role !== undefined) mapped.role = updates.role;
  if (updates.status !== undefined) mapped.status = updates.status;

  const { error } = await supabase.from('personal').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deletePersonal(id: string): Promise<void> {
  const { error } = await supabase.from('personal').delete().eq('id', id);
  if (error) throw error;
}

export function onPersonalChange(callback: (personal: Personal[]) => void): () => void {
  getPersonal().then(callback).catch((err) => {
    console.error('[onPersonalChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('personal-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'personal' },
      () => {
        getPersonal().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
