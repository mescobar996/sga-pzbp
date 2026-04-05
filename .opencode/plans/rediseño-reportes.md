# Plan: Rediseño Reportes Exportados - Neo-Brutalist

## Archivo a modificar

`src/pages/Reportes.tsx` (1735 líneas)

## Cambios

### 1. PDF - Rediseño Neo-Brutalist (líneas 318-1059)

- Portada: fondo #f5f0e8, badge negro, Space Grotesk, stat cards con borde 3px + sombra dura
- KPIs: colores de marca (#0055ff, #00cc66, #e63b2e), progress bars con borde
- Tablas: header #1a1a1a/texto blanco, filas alternadas, bordes 2px
- Data cards: borde 3px + sombra dura, badges rectangulares
- Tipografía: Space Grotesk títulos, Inter cuerpo

### 2. Excel - Estilos Profesionales (líneas 1157-1280)

- Nueva hoja RESUMEN con KPIs
- Headers con colores de marca, filas alternadas, bordes
- AutoFilter, freeze panes, column widths optimizados

### 3. JSON - Metadata Enriquecida (líneas 1282-1340)

- KPIs calculados, versión 2.0.0, fechas ISO 8601

## Implementación

Todo en Reportes.tsx. Sin nuevas dependencias.
