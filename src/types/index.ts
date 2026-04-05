export interface UserDoc {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  role: 'admin' | 'user';
}

export interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface TaskSubtask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'alta' | 'media' | 'baja';
  status: 'pendiente' | 'en_proceso' | 'completado';
  dueDate?: string;
  createdAt: string;
  assignedTo?: string;
  authorId: string;
  tags?: string[];
  attachments?: TaskAttachment[];
  subtasks?: TaskSubtask[];
  recurrence?: 'none' | 'diaria' | 'semanal' | 'mensual';
  comments?: TaskComment[];
}

export interface TaskHistory {
  id: string;
  taskId: string;
  taskTitle: string;
  action: 'completado' | 'eliminado';
  timestamp: string;
  userId: string;
  userEmail: string;
}

export interface Personal {
  id: string;
  name: string;
  role: string;
  status: 'Activo' | 'Inactivo';
  createdAt: string;
  authorId: string;
}

export interface Location {
  id: string;
  name: string;
  type: 'Origen' | 'Destino' | 'Origen/Destino';
  status: 'Operativo' | 'Mantenimiento' | 'Inactivo';
  latitude?: number;
  longitude?: number;
  createdAt: string;
  authorId: string;
}

export interface VisitaComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Visita {
  id: string;
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  responsable: string;
  observaciones?: string;
  createdAt: string;
  authorId: string;
  comments?: VisitaComment[];
}

export interface NovedadAttachment {
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface Novedad {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  authorId: string;
  authorName: string;
  attachments?: NovedadAttachment[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'tarea' | 'visita' | 'novedad';
  createdAt: string;
  authorId: string;
  recipientId?: string;
}

export type CollectionName =
  | 'tasks'
  | 'task_history'
  | 'personal'
  | 'locations'
  | 'visitas'
  | 'novedades'
  | 'notifications'
  | 'users';
