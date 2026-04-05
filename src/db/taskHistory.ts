import { supabase } from './client';
import type { TaskHistory } from '../types';

function mapTaskHistory(row: Record<string, any>): TaskHistory {
  return {
    id: row.id,
    taskId: row.task_id || '',
    taskTitle: row.task_title || '',
    action: row.action || 'eliminado',
    timestamp: row.timestamp || '',
    userId: row.user_id || '',
    userEmail: row.user_email || '',
  };
}

export async function getTaskHistory(): Promise<TaskHistory[]> {
  const { data, error } = await supabase
    .from('task_history')
    .select('*')
    .order('timestamp', { ascending: false });
  if (error) throw error;
  return data.map(mapTaskHistory);
}

export function onTaskHistoryChange(callback: (history: TaskHistory[]) => void): () => void {
  getTaskHistory().then(callback).catch((err) => {
    console.error('[onTaskHistoryChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('task_history-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'task_history' },
      () => {
        getTaskHistory().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
