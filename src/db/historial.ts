import { supabase } from './client';
import { getTasks } from './tasks';
import { getVisitas } from './visitas';
import { getNovedades } from './novedades';
import { getDiligenciamientos } from './diligenciamientos';

export async function getConsolidatedHistory(locationId: string) {
  // 1. Obtener datos filtrados por locationId (o nombre si aún no están todos migrados)
  // Nota: Esto asume que las funciones de get ya fueron ajustadas para aceptar filtros opcionales
  const [tasks, visitas, novedades, diligenciamientos] = await Promise.all([
    getTasks(), // Ajustar si es necesario filtrar tareas por ubicación
    getVisitas(), // Ajustar si es necesario filtrar por ubicación
    getNovedades(), // Ajustar si es necesario filtrar por ubicación
    getDiligenciamientos({ category: undefined }) // Ajustar para aceptar locationId
  ]);

  // 2. Normalizar y consolidar en una sola estructura
  const history = [
    ...tasks.filter(t => t.tags?.includes(locationId)).map(t => ({ ...t, type: 'TAREA', createdAt: t.createdAt })),
    ...visitas.filter(v => v.locationId === locationId).map(v => ({ ...v, type: 'VISITA', createdAt: v.createdAt })),
    ...novedades.filter(n => n.locationId === locationId).map(n => ({ ...n, type: 'NOVEDAD', createdAt: n.createdAt })),
    ...diligenciamientos.filter(d => d.locationId === locationId).map(d => ({ ...d, type: 'DILIGENCIA', createdAt: d.createdAt })),
  ];

  // 3. Ordenar cronológicamente (más reciente primero)
  return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
