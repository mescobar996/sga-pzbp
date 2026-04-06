# Diseño: Sistema de Restauración Masiva Inteligente

**Fecha:** 2026-04-05
**Estado:** Pendiente de Implementación
**Autor:** Gemini CLI
**Proyecto:** sgo-pzbp

## 1. Objetivo
Mejorar la funcionalidad actual de "Importar Datos" en la sección de Base de Datos para que sea capaz de procesar archivos JSON de backup completo (multi-tabla) de forma automática, utilizando una estrategia de fusión (merge) para no perder datos actuales.

## 2. Especificaciones Técnicas

### A. Detección de Estructura
El sistema analizará el contenido del archivo JSON subido:
*   **Modo Multi-Tabla**: Si el objeto raíz contiene claves que coinciden con los nombres de las tablas (`tasks`, `visitas`, `novedades`, etc.), se activará el flujo de restauración total.
*   **Modo Mono-Tabla**: Si es una lista simple o no se detectan claves de sistema, se permitirá seleccionar la tabla de destino manualmente (comportamiento actual mejorado).

### B. Estrategia de Inserción (Upsert)
Para evitar duplicados y permitir la actualización de registros:
*   Se utilizará `supabase.from(table).upsert(data, { onConflict: 'id' })`.
*   Esto asegura que si un registro con el mismo `id` ya existe, se actualicen sus campos con la información del backup.

### C. Orden de Precedencia (Integridad Referencial)
Para evitar errores de claves foráneas, el orden de importación será:
1.  `users` (Perfiles de usuario)
2.  `locations` y `personal` (Tablas maestras)
3.  `tasks`, `visitas` y `novedades` (Tablas principales)
4.  `task_history` y `notifications` (Registros de actividad)

### D. Interfaz de Usuario (UI)
*   **Resumen Pre-Importación**: Al seleccionar el archivo, se mostrará un desglose de cuántos registros se han encontrado por cada tabla.
*   **Feedback de Progreso**: Indicador visual del estado de carga ("Procesando tareas: 45/100...").
*   **Reporte de Resultados**: Al finalizar, se mostrará un resumen de inserciones exitosas y errores (si los hubo).

## 3. Cambios en el Código
*   `src/pages/BaseDatos.tsx`: Rediseño de `handleImportFile` para detección automática y `handleImportData` para el bucle de tablas.
*   `src/db/client.ts`: Asegurar que las llamadas a la base de datos manejen correctamente el modo masivo.

## 4. Criterios de Éxito
1.  Un usuario puede subir un JSON de exportación y restaurar toda la base de datos con un solo clic.
2.  No se generan errores de integridad referencial durante la carga.
3.  Los registros existentes se actualizan en lugar de duplicarse.
