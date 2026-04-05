import { z } from 'zod';

export const taskSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(200, 'Máximo 200 caracteres'),
  description: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
  priority: z.enum(['alta', 'media', 'baja']),
  status: z.enum(['pendiente', 'en_proceso', 'completado']),
  dueDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD')
    .optional()
    .or(z.literal('')),
  assignedTo: z.string().max(100).optional().or(z.literal('')),
  tags: z.array(z.string()).max(20).optional(),
  recurrence: z.enum(['none', 'diaria', 'semanal', 'mensual']).optional(),
});

export const visitaSchema = z.object({
  origen: z.string().min(1, 'El origen es obligatorio').max(200, 'Máximo 200 caracteres'),
  destino: z.string().min(1, 'El destino es obligatorio').max(200, 'Máximo 200 caracteres'),
  fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Formato: YYYY-MM-DD'),
  hora: z.string().regex(/^\d{2}:\d{2}$/, 'Formato: HH:MM'),
  responsable: z.string().min(1, 'Al menos un responsable es obligatorio').max(100, 'Máximo 100 caracteres'),
  observaciones: z.string().max(2000, 'Máximo 2000 caracteres').optional().or(z.literal('')),
});

export const novedadSchema = z.object({
  title: z.string().min(1, 'El título es obligatorio').max(200, 'Máximo 200 caracteres'),
  content: z.string().min(1, 'El contenido es obligatorio').max(5000, 'Máximo 5000 caracteres'),
});

export const personalSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  role: z.string().min(1, 'El rol es obligatorio').max(100, 'Máximo 100 caracteres'),
  status: z.enum(['Activo', 'Inactivo']),
});

export const locationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Máximo 100 caracteres'),
  type: z.enum(['Origen', 'Destino', 'Origen/Destino']),
  status: z.enum(['Operativo', 'Mantenimiento', 'Inactivo']),
  latitude: z.number().min(-90).max(90).optional().or(z.undefined()),
  longitude: z.number().min(-180).max(180).optional().or(z.undefined()),
});

export const visitaCommentSchema = z.object({
  content: z.string().min(1, 'El comentario no puede estar vacío').max(1000, 'Máximo 1000 caracteres'),
});

export const taskCommentSchema = z.object({
  content: z.string().min(1, 'El comentario no puede estar vacío').max(1000, 'Máximo 1000 caracteres'),
});
