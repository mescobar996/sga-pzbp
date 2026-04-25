import { describe, it, expect } from 'vitest';
import {
  taskSchema,
  visitaSchema,
  novedadSchema,
  personalSchema,
  locationSchema,
  visitaCommentSchema,
  taskCommentSchema,
} from './validation';

describe('taskSchema', () => {
  it('should pass with valid data', () => {
    const result = taskSchema.safeParse({
      title: 'Test task',
      priority: 'alta',
      status: 'pendiente',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty title', () => {
    const result = taskSchema.safeParse({
      title: '',
      priority: 'alta',
      status: 'pendiente',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with title > 200 chars', () => {
    const result = taskSchema.safeParse({
      title: 'a'.repeat(201),
      priority: 'alta',
      status: 'pendiente',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid priority', () => {
    const result = taskSchema.safeParse({
      title: 'Test',
      priority: 'urgent',
      status: 'pendiente',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid status', () => {
    const result = taskSchema.safeParse({
      title: 'Test',
      priority: 'alta',
      status: 'archived',
    });
    expect(result.success).toBe(false);
  });

  it('should pass with valid dueDate', () => {
    const result = taskSchema.safeParse({
      title: 'Test',
      priority: 'alta',
      status: 'pendiente',
      dueDate: '2025-12-31',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with invalid dueDate format', () => {
    const result = taskSchema.safeParse({
      title: 'Test',
      priority: 'alta',
      status: 'pendiente',
      dueDate: '31/12/2025',
    });
    expect(result.success).toBe(false);
  });

  it('should pass with valid recurrence', () => {
    const result = taskSchema.safeParse({
      title: 'Recurring task',
      priority: 'media',
      status: 'en_proceso',
      recurrence: 'semanal',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with invalid recurrence', () => {
    const result = taskSchema.safeParse({
      title: 'Recurring task',
      priority: 'media',
      status: 'en_proceso',
      recurrence: 'yearly',
    });
    expect(result.success).toBe(false);
  });

  it('should pass with empty description', () => {
    const result = taskSchema.safeParse({
      title: 'Test',
      priority: 'baja',
      status: 'completado',
      description: '',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with description > 2000 chars', () => {
    const result = taskSchema.safeParse({
      title: 'Test',
      priority: 'baja',
      status: 'completado',
      description: 'a'.repeat(2001),
    });
    expect(result.success).toBe(false);
  });
});

describe('visitaSchema', () => {
  it('should pass with valid data', () => {
    const result = visitaSchema.safeParse({
      origen: 'Oficina Central',
      destino: 'Sucursal Norte',
      fecha: '2025-06-15',
      hora: '14:30',
      responsable: 'Juan Perez',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty origen', () => {
    const result = visitaSchema.safeParse({
      origen: '',
      destino: 'Sucursal Norte',
      fecha: '2025-06-15',
      hora: '14:30',
      responsable: 'Juan Perez',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with empty destino', () => {
    const result = visitaSchema.safeParse({
      origen: 'Oficina Central',
      destino: '',
      fecha: '2025-06-15',
      hora: '14:30',
      responsable: 'Juan Perez',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with empty responsable', () => {
    const result = visitaSchema.safeParse({
      origen: 'Oficina Central',
      destino: 'Sucursal Norte',
      fecha: '2025-06-15',
      hora: '14:30',
      responsable: '',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid fecha format', () => {
    const result = visitaSchema.safeParse({
      origen: 'Oficina Central',
      destino: 'Sucursal Norte',
      fecha: '15/06/2025',
      hora: '14:30',
      responsable: 'Juan Perez',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid hora format', () => {
    const result = visitaSchema.safeParse({
      origen: 'Oficina Central',
      destino: 'Sucursal Norte',
      fecha: '2025-06-15',
      hora: '2:30 PM',
      responsable: 'Juan Perez',
    });
    expect(result.success).toBe(false);
  });

  it('should pass with empty observaciones', () => {
    const result = visitaSchema.safeParse({
      origen: 'Oficina Central',
      destino: 'Sucursal Norte',
      fecha: '2025-06-15',
      hora: '14:30',
      responsable: 'Juan Perez',
      observaciones: '',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with origen > 200 chars', () => {
    const result = visitaSchema.safeParse({
      origen: 'a'.repeat(201),
      destino: 'Sucursal Norte',
      fecha: '2025-06-15',
      hora: '14:30',
      responsable: 'Juan Perez',
    });
    expect(result.success).toBe(false);
  });
});

describe('novedadSchema', () => {
  it('should pass with valid data', () => {
    const result = novedadSchema.safeParse({
      title: 'Novedad importante',
      content: 'Contenido de la novedad',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty title', () => {
    const result = novedadSchema.safeParse({
      title: '',
      content: 'Contenido de la novedad',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with empty content', () => {
    const result = novedadSchema.safeParse({
      title: 'Novedad',
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with content > 5000 chars', () => {
    const result = novedadSchema.safeParse({
      title: 'Novedad',
      content: 'a'.repeat(5001),
    });
    expect(result.success).toBe(false);
  });
});

describe('personalSchema', () => {
  it('should pass with valid data', () => {
    const result = personalSchema.safeParse({
      name: 'Maria Lopez',
      role: 'Supervisor',
      status: 'Activo',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty name', () => {
    const result = personalSchema.safeParse({
      name: '',
      role: 'Supervisor',
      status: 'Activo',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with empty role', () => {
    const result = personalSchema.safeParse({
      name: 'Maria Lopez',
      role: '',
      status: 'Activo',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid status', () => {
    const result = personalSchema.safeParse({
      name: 'Maria Lopez',
      role: 'Supervisor',
      status: 'En vacaciones',
    });
    expect(result.success).toBe(false);
  });

  it('should pass with Inactivo status', () => {
    const result = personalSchema.safeParse({
      name: 'Maria Lopez',
      role: 'Supervisor',
      status: 'Inactivo',
    });
    expect(result.success).toBe(true);
  });
});

describe('locationSchema', () => {
  it('should pass with valid data', () => {
    const result = locationSchema.safeParse({
      name: 'Almacen Central',
      type: 'Origen',
      status: 'Operativo',
    });
    expect(result.success).toBe(true);
  });

  it('should pass with Origen/Destino type', () => {
    const result = locationSchema.safeParse({
      name: 'Punto Intermedio',
      type: 'Origen/Destino',
      status: 'Operativo',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty name', () => {
    const result = locationSchema.safeParse({
      name: '',
      type: 'Origen',
      status: 'Operativo',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid type', () => {
    const result = locationSchema.safeParse({
      name: 'Almacen',
      type: 'Warehouse',
      status: 'Operativo',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with invalid status', () => {
    const result = locationSchema.safeParse({
      name: 'Almacen',
      type: 'Origen',
      status: 'Desconocido',
    });
    expect(result.success).toBe(false);
  });

  it('should pass with Mantenimiento status', () => {
    const result = locationSchema.safeParse({
      name: 'Almacen',
      type: 'Destino',
      status: 'Mantenimiento',
    });
    expect(result.success).toBe(true);
  });
});

describe('visitaCommentSchema', () => {
  it('should pass with valid comment', () => {
    const result = visitaCommentSchema.safeParse({
      content: 'Comentario de prueba',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty comment', () => {
    const result = visitaCommentSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with comment > 1000 chars', () => {
    const result = visitaCommentSchema.safeParse({
      content: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});

describe('taskCommentSchema', () => {
  it('should pass with valid comment', () => {
    const result = taskCommentSchema.safeParse({
      content: 'Comentario en tarea',
    });
    expect(result.success).toBe(true);
  });

  it('should fail with empty comment', () => {
    const result = taskCommentSchema.safeParse({
      content: '',
    });
    expect(result.success).toBe(false);
  });

  it('should fail with comment > 1000 chars', () => {
    const result = taskCommentSchema.safeParse({
      content: 'a'.repeat(1001),
    });
    expect(result.success).toBe(false);
  });
});
