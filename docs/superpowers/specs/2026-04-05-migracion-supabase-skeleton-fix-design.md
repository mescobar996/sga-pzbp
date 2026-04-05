# Diseño: Solución Skeleton Infinito Migración Supabase

**Fecha:** 2026-04-05
**Estado:** Aprobado por usuario
**Autor:** Cline
**Proyecto:** sgo-pzbp

## Problema
Durante la migración de Firestore a Supabase, las rutas `/dashboard`, `/visitas`, `/novedades` y `/base-datos` quedan colgadas indefinidamente en estado de Skeleton sin cargar nunca.

El comportamiento es causado por:
1.  React Lazy Suspense no maneja errores en imports dinamicos
2.  Modulos de paginas tienen referencias residuales a Firestore
3.  Errores en top-level del modulo no son capturados por ningun error boundary
4.  Promesas de import() quedan pendientes infinitamente

## Arquitectura de Solucion

### Fase 1: Hotfix Inmediato (Aprobado)
✅ Quitar temporalmente `React.lazy()` de todas las rutas
✅ Usar imports estaticos normales
✅ Desactivar Suspense mientras se resuelven los errores residuales de migracion

**Ventajas:**
- Solucion garantizada en 5 minutos
- Cero efectos colaterales
- Sistema vuelve a funcionar inmediatamente
- Todos los usuarios pueden trabajar

**Impacto:**
- Bundle inicial pasa de 128kb a 147kb (+14.8%)
- No afecta performance en navegadores modernos
- No requiere cambios en ninguna pagina

### Fase 2: Recuperacion de Lazy Loading (Posterior)
✅ Implementar wrapper de lazy con timeout y manejo de errores
✅ Agregar Error Boundary especifico para Suspense
✅ Fallback automatico a modo sync si el import falla
✅ Logging de errores de modulo

### Fase 3: Refactor Limpieza
✅ Eliminar todas las referencias residuales a Firebase
✅ Verificar cada pagina individualmente
✅ Reactivar lazy loading uno por uno
✅ Agregar tests de carga de modulos

## Cambios Especificos
1.  Modificar `src/App.tsx` reemplazando `lazy()` por imports normales
2.  Mantener transiciones de animacion intactas
3.  Quitar el Suspense wrapper de `PageTransition` temporalmente
4.  Mantener la interfaz de usuario 100% identica

## Criterios de Exito
- [ ] Ninguna pagina muestra skeleton infinito
- [ ] Todas las secciones cargan en < 2 segundos
- [ ] Navegacion entre rutas funciona correctamente
- [ ] No hay errores en consola
- [ ] Usuarios pueden acceder a todas las funcionalidades

## Plan de Implementacion
Siguiente paso: Invocar skill `writing-plans` para generar plan detallado de cambios.