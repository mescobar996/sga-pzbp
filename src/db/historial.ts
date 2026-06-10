import { supabase } from './client';
import { getTasks } from './tasks';
import { getVisitas } from './visitas';
import { getNovedades } from './novedades';
import { getDiligenciamientos } from './diligenciamientos';

export async function getConsolidatedHistory(locationId: string) {
  // 1. Obtener datos. 
  // Las funciones get* ya obtienen una lista general, filtraremos en memoria.
  const [tasks, visitas, novedades, diligenciamientos] = await Promise.all([
    getTasks(),
    getVisitas(),
    getNovedades(),
    getDiligenciamientos() // getDiligenciamientos acepta filtros, pero los llamamos sin para obtener todos y filtrar
  ]);

  // 2. Normalizar y consolidar en una sola estructura.
  // IMPORTANTE: Asegurar que los filtros coinciden con el esquema de datos (locationId o tags).
  const history = [
    ...tasks.filter(t => t.tags?.includes(locationId)).map(t => ({ ...t, type: 'TAREA', createdAt: t.createdAt })),
    ...visitas.filter(v => v.locationId === locationId).map(v => ({ ...v, type: 'VISITA', createdAt: v.createdAt })),
    ...novedades.filter(n => n.locationId === locationId).map(n => ({ ...n, type: 'NOVEDAD', createdAt: n.createdAt })),
    ...diligenciamientos.filter(d => d.locationId === locationId).map(d => ({ ...d, type: 'DILIGENCIA', createdAt: d.createdAt })),
  ];

  // 3. Ordenar cronológicamente (más reciente primero)
  return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
