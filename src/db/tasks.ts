import { supabase, getCurrentUserId, getCurrentUserEmail } from './client';
import type { Task, TaskHistory } from '../types';

export type Attachment = {
  name: string;
  url: string;
  type: string;
  path: string;
  size?: number;
};

export type Subtask = {
  id: string;
  title: string;
  completed: boolean;
};

export type TaskComment = {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
};

function mapTask(row: Record<string, any>): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    priority: row.priority || 'media',
    status: row.status || 'pendiente',
    createdAt: row.created_at || '',
    authorId: row.author_id || '',
    dueDate: row.due_date || '',
    assignedTo: row.assigned_to || '',
    attachments: (row.attachments || []) as any,
    tags: row.tags || [],
    subtasks: (row.subtasks || []) as Subtask[],
    recurrence: row.recurrence || 'none',
    comments: (row.comments || []) as TaskComment[],
  };
}

export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(500);
  if (error) throw error;
  return data.map(mapTask);
}

export async function addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<string> {
  const authorId = getCurrentUserId();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      due_date: task.dueDate || null,
      author_id: authorId,
      assigned_to: task.assignedTo || null,
      attachments: task.attachments || [],
      tags: task.tags || [],
      subtasks: task.subtasks || [],
      comments: task.comments || [],
      recurrence: task.recurrence || 'none',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<void> {
  const mapped: Record<string, any> = {};
  if (updates.title !== undefined) mapped.title = updates.title;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.priority !== undefined) mapped.priority = updates.priority;
  if (updates.status !== undefined) mapped.status = updates.status;
  if (updates.dueDate !== undefined) mapped.due_date = updates.dueDate || null;
  if (updates.assignedTo !== undefined) mapped.assigned_to = updates.assignedTo || null;
  if (updates.attachments !== undefined) mapped.attachments = updates.attachments;
  if (updates.tags !== undefined) mapped.tags = updates.tags;
  if (updates.subtasks !== undefined) mapped.subtasks = updates.subtasks;
  if (updates.comments !== undefined) mapped.comments = updates.comments;
  if (updates.recurrence !== undefined) mapped.recurrence = updates.recurrence;

  const { error } = await supabase.from('tasks').update(mapped).eq('id', id);
  if (error) throw error;
}

export async function deleteTask(id: string): Promise<void> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  if (error) throw error;
}

export async function logTaskHistory(
  taskId: string,
  taskTitle: string,
  action: 'completado' | 'eliminado',
): Promise<void> {
  const userId = getCurrentUserId();
  const userEmail = getCurrentUserEmail();
  const { error } = await supabase.from('task_history').insert({
    task_id: taskId,
    task_title: taskTitle,
    action,
    user_id: userId,
    user_email: userEmail,
  });
  if (error) console.error('Error logging task history:', error);
}

export function onTasksChange(callback: (tasks: Task[]) => void): () => void {
  getTasks().then(callback).catch((err) => {
    console.error('[onTasksChange]', err);
    callback([]);
  });
  const channel = supabase
    .channel('tasks-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'tasks' },
      () => {
        getTasks().then(callback);
      },
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}
