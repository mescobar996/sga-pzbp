import { supabase, getCurrentUserId } from './client';
import type { Location } from '../types';

function mapLocation(row: Record<string, any>): Location {
  return {
    id: row.id,
    name: row.name,
    type: row.type || 'Origen',
    status: row.status || 'Operativo',
    latitude: row.latitude,
    longitude: row.longitude,
    createdAt: row.created_at || '',
    authorId: row.author_id || '',
  };
}

export async function getLocations(): Promise<Location[]> {
  const { data, error } = await supabase.from('locations').select('*').order('name');
  if (error) throw error;
  return data.map(mapLocation);
}

export async function addLocation(item: {
  name: string;
  type: 'Origen' | 'Destino' | 'Origen/Destino';
  status: 'Operativo' | 'Mantenimiento' | 'Inactivo';
  latitude?: number;
  longitude?: number;
}): Promise<void> {
  const authorId = getCurrentUserId();
  const coords: Record<string, number | undefined> = {};
  if (typeof item.latitude === 'number' && !isNaN(item.latitude)) coords.latitude = item.latitude;
  if (typeof item.longitude === 'number' && !isNaN(item.longitude)) coords.longitude = item.longitude;

  const { error } = await supabase.from('locations').insert({
    name: item.name,
    type: item.type,
    status: item.status,
    ...coords,
    author_id: authorId,
  });
  if (error) throw error;
}

export async function updateLocation(id: string, updates: Partial<Location>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.type !== undefined) mapped.type = updates.type;
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.latitude !== undefined) mapped.latitude = updates.latitude;
  if (updates.longitude !== undefined) mapped.longitude = updates.longitude;

  const { error } = await supabase.from('locations').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteLocation(id: string): Promise<void> {
  const { error } = await supabase.from('locations').delete().eq('id', id);
  if (error) throw error;
}

export function onLocationsChange(callback: (locations: Location[]) => void): () => void {
  getLocations().then(callback).catch((err) => {
    console.error('[onLocationsChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('locations-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'locations' },
      () => {
        getLocations().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
