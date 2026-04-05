import { supabase, getCurrentUserId } from './client';
import type { AppNotification } from '../types';

function mapNotification(row: Record<string, any>): AppNotification {
  return {
    id: row.id,
    title: row.title,
    message: row.message || '',
    type: row.type || 'tarea',
    createdAt: row.created_at || '',
    authorId: row.author_id || '',
    recipientId: row.recipient_id,
  };
}

export async function getNotifications(): Promise<AppNotification[]> {
  const userId = getCurrentUserId();
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw error;
  return data
    .map(mapNotification)
    .filter((n) => !n.recipientId || n.recipientId === userId);
}

export async function addNotification(notification: {
  title: string;
  message: string;
  type: 'tarea' | 'visita' | 'novedad';
  recipientId?: string;
}): Promise<void> {
  const authorId = getCurrentUserId();
  const { error } = await supabase.from('notifications').insert({
    title: notification.title,
    message: notification.message,
    type: notification.type,
    author_id: authorId,
    recipient_id: notification.recipientId || null,
  });
  if (error) throw error;
}

export async function deleteNotification(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').delete().eq('id', id);
  if (error) throw error;
}

export async function clearAllNotifications(): Promise<void> {
  const userId = getCurrentUserId();
  const { error } = await supabase.from('notifications').delete().or(`author_id.eq.${userId},recipient_id.eq.${userId}`);
  if (error) throw error;
}

export function onNotificationsChange(callback: (notifications: AppNotification[]) => void): () => void {
  getNotifications().then(callback).catch((err) => {
    console.error('[onNotificationsChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('notifications-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'notifications' },
      () => {
        getNotifications().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
