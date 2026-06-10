import { supabase } from './client';
import { getTasks } from './tasks';
import { getVisitas } from './visitas';
import { getNovedades } from './novedades';
import { getDiligenciamientos } from './diligenciamientos';

export async function getConsolidatedHistory(locationName: string) {
  // 1. Obtener datos (sin incluir tareas).
  const [visitas, novedades, diligenciamientos] = await Promise.all([
    getVisitas(),
    getNovedades(),
    getDiligenciamientos()
  ]);

  // 2. Normalizar y consolidar Visitas, Novedades y Diligencias.
  // Filtramos por el nombre de la ubicación (cuatrigrama).
  // Nota: Las Novedades y Diligencias parecen no tener locationId. 
  // Intentaremos filtrar buscando el nombre de la ubicación en el título o contenido.
  const history = [
    ...visitas.filter(v => v.destino === locationName || v.origen === locationName).map(v => ({ ...v, type: 'VISITA', createdAt: v.createdAt })),
    ...novedades.filter(n => n.title.includes(locationName) || n.content.includes(locationName)).map(n => ({ ...n, type: 'NOVEDAD', createdAt: n.createdAt })),
    ...diligenciamientos.filter(d => d.title.includes(locationName) || d.content.includes(locationName)).map(d => ({ ...d, type: 'DILIGENCIA', createdAt: d.createdAt })),
  ];

  // 3. Ordenar cronológicamente (más reciente primero)
  return history.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}
