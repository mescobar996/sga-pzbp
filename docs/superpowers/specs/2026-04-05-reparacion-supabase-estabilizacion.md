# Diseño: Reparación de Skeleton Infinito y Estabilización Supabase

**Fecha:** 2026-04-05
**Estado:** Pendiente de Revisión Final
**Autor:** Gemini CLI
**Proyecto:** sgo-pzbp

## 1. Problema Actual
La aplicación se queda bloqueada en estado de "Skeleton" (carga infinita) en las secciones clave: Panel de Control, Lista de Tareas, Novedades y Base de Datos. 

### Causas Identificadas:
1.  **Bloqueo de Lazy Loading**: `React.lazy()` y `Suspense` están fallando al resolver los módulos dinámicos en tiempo de ejecución, posiblemente debido a errores silenciosos en el top-level de los módulos o problemas de red con los chunks de Vite.
2.  **Promesas Colgadas**: Las llamadas a Supabase no tienen un mecanismo de timeout, lo que causa que los `useEffect` de las páginas nunca terminen su estado de `loading: true` si la respuesta de la base de datos se pierde o tarda demasiado.
3.  **Inconsistencia de Esquema**: Existe una discrepancia entre el esquema SQL (algunos archivos usan camelCase) y la implementación de la base de datos (snake_case).

## 2. Arquitectura de la Solución

### Fase 1: Carga Síncrona de Módulos (Estabilización UI)
Se eliminará el uso de `React.lazy` para garantizar que todos los componentes de la aplicación estén disponibles inmediatamente al cargar el bundle inicial.

*   **Archivo**: `src/App.tsx`
*   **Cambio**: Reemplazar `lazy()` por `import` estáticos.
*   **Acción**: Eliminar el componente `<Suspense>` del wrapper de rutas, ya que no habrá estados de espera de carga de módulo.

### Fase 2: Robustez en la Capa de Datos (Supabase)
Implementaremos una capa de seguridad para evitar que las consultas a la base de datos dejen la UI en un estado indeterminado.

*   **Timeouts**: Envoltorio para llamadas asíncronas que fallan automáticamente tras 8 segundos.
*   **Manejo de Errores en Páginas**: Actualización de `Dashboard.tsx`, `Tareas.tsx`, `Novedades.tsx` y `BaseDatos.tsx` para asegurar que el estado `loading` siempre pase a `false` en el bloque `finally {}`.
*   **Logging**: Mejorar la visibilidad de errores de Supabase (RLS, conexión, autenticación) en la consola de desarrollo.

### Fase 3: Corrección de Esquema (Normalización)
Asegurar que todas las interacciones con las tablas sigan el estándar definido en `migrations/001_initial_schema.sql` (snake_case).

*   **Tablas afectadas**: `tasks` (`due_date`, `assigned_to`, `author_id`), `visitas` (`author_id`), `novedades` (`author_id`, `author_name`), etc.
*   **Verificación de Tipos**: Asegurar que `src/types/index.ts` refleje exactamente el esquema de Supabase.

## 3. Criterios de Aceptación
1.  La aplicación carga la página de inicio (Dashboard) en < 2 segundos tras el login.
2.  Ninguna navegación entre pestañas resulta en un skeleton infinito.
3.  Si no hay conexión a Supabase, se muestra un mensaje de error claro en la UI.
4.  Todas las tablas de la base de datos son legibles y escribibles (CRUD funcional).

## 4. Plan de Implementación (Resumen)
1.  Modificar `App.tsx` para usar imports estáticos.
2.  Actualizar la lógica de carga en las 4 páginas críticas.
3.  Verificar y corregir discrepancias de nombres de columnas en los archivos de `src/db/*.ts`.
