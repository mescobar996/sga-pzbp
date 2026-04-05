# Spec: Mapa de Visitas

## Overview

Agregar un mapa interactivo de visitas con coordenadas geográficas para los Orígenes/Destinos, permitiendo visualizar en un mapa todas las ubicaciones y las rutas de las visitas registradas.

## Changes Required

### 1. Database Schema Changes

**Collection: `locations`** — Agregar campos opcionales:

- `latitude?: number` — Latitud del lugar
- `longitude?: number` — Longitud del lugar

**Collection: `visitas`** — Sin cambios. Las visitas siguen guardando `origen` y `destino` como texto (nombre del lugar). El mapa resuelve las coordenadas haciendo lookup en la colección `locations`.

### 2. Type Changes (`src/types/index.ts`)

```typescript
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
```

### 3. Validation Changes (`src/utils/validation.ts`)

```typescript
export const locationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Maximo 100 caracteres'),
  type: z.enum(['Origen', 'Destino', 'Origen/Destino']),
  status: z.enum(['Operativo', 'Mantenimiento', 'Inactivo']),
  latitude: z.number().min(-90).max(90).optional().or(z.literal(0).optional()),
  longitude: z.number().min(-180).max(180).optional().or(z.literal(0).optional()),
});
```

### 4. New Dependencies

```bash
npm install leaflet react-leaflet
npm install -D @types/leaflet
```

### 5. New Components

#### `src/components/LocationMapPicker.tsx`

Modal con mapa interactivo para seleccionar coordenadas de un lugar.

**Props:**

- `isOpen: boolean`
- `onClose: () => void`
- `onSelect: (lat: number, lng: number) => void`
- `initialLat?: number`
- `initialLng?: number`

**Features:**

- Mapa Leaflet centrado en Argentina (zoom ~6)
- Click en el mapa coloca un marcador y actualiza lat/lng
- Buscador de direcciones con geocodificación Nominatim (API gratuita, sin key)
- Campos manuales de lat/lng editables
- Botón "Usar esta ubicación" que llama `onSelect`
- Loading state mientras geocodifica

**Geocodificación:**

- Endpoint: `https://nominatim.openstreetmap.org/search?format=json&q={query}&countrycodes=ar&limit=1`
- Header requerido: `User-Agent: SGA-PZBP/1.0`
- Rate limit: 1 request/second (implementar debounce)

#### `src/pages/MapaVisitas.tsx`

Página principal del mapa de visitas.

**Layout:**

- Panel izquierdo (30% width, responsive: en mobile se colapsa a drawer): Lista de visitas
- Panel derecho (70% width): Mapa Leaflet

**Panel de lista:**

- Filtros:
  - Rango de fechas (date picker desde/hasta)
  - Responsable (dropdown con responsables únicos)
  - Origen (dropdown con orígenes)
  - Destino (dropdown con destinos)
- Lista scrolleable de visitas filtradas:
  - Cada item muestra: fecha, origen, destino, responsable
  - Click en item → selecciona visita y actualiza mapa
  - Item seleccionado resaltado visualmente
- Contador de resultados

**Mapa:**

- Todos los locations con coordenadas como marcadores:
  - Orígenes: icono verde
  - Destinos: icono rojo
  - Origen/Destino: icono naranja
- Popup en cada marcador: nombre del lugar, tipo, status
- Al seleccionar una visita de la lista:
  - Dibujar línea (polyline) azul entre origen y destino
  - Zoom automático para mostrar ambos puntos
  - Popup con detalles de la visita
- Botón para limpiar selección y volver a ver solo pines
- Controles de zoom de Leaflet

### 6. New Route

En `src/App.tsx`:

```tsx
const MapaVisitas = lazy(() => import('./pages/MapaVisitas'));
// ...
<Route path="/mapa-visitas" element={<MapaVisitas />} />;
```

En `src/components/Layout.tsx`, agregar al sidebar:

```tsx
{ to: '/mapa-visitas', icon: Map, label: 'Mapa de Visitas' }
```

### 7. Changes to Existing Files

#### `src/pages/BaseDatos.tsx`

- Agregar botón "📍 Ubicar en mapa" en el modal de crear/editar location
- Al hacer click, abrir `LocationMapPicker` como sub-modal
- Al recibir coordenadas, actualizar los campos `latitude` y `longitude` del form
- Mostrar mini-preview de coordenadas si ya están cargadas (ej: "📍 -27.78, -64.26")

#### `src/types/index.ts`

- Agregar `latitude?: number` y `longitude?: number` al tipo `Location`

#### `src/utils/validation.ts`

- Actualizar `locationSchema` para incluir campos opcionales de coordenadas

## Implementation Order

1. Instalar dependencias (leaflet, react-leaflet, @types/leaflet)
2. Actualizar tipos (`Location`) y validación (`locationSchema`)
3. Crear componente `LocationMapPicker.tsx`
4. Modificar `BaseDatos.tsx` para integrar el map picker
5. Crear página `MapaVisitas.tsx`
6. Agregar ruta y navegación
7. Testing y verificación de build

## Acceptance Criteria

- [ ] `npm run build` pasa sin errores
- [ ] `npm run test:run` pasa sin errores
- [ ] Se pueden crear/editar locations con coordenadas desde Base de Datos
- [ ] Se pueden buscar direcciones y geocodificar en el map picker
- [ ] Se pueden ingresar coordenadas manualmente
- [ ] La página Mapa de Visitas muestra todos los pines correctamente
- [ ] Los filtros de la lista funcionan (fecha, responsable, origen, destino)
- [ ] Al seleccionar una visita se dibuja la ruta en el mapa
- [ ] En mobile la lista se comporta como drawer colapsable
- [ ] No hay cambios de comportamiento en funcionalidades existentes
- [ ] No hay breaking changes

## Technical Notes

- Leaflet CSS debe importarse en el componente que usa el mapa o en `main.tsx`
- El mapa necesita un contenedor con altura explícita (Leaflet requirement)
- Nominatim requiere User-Agent header y tiene rate limit de 1 req/s
- Para producción, considerar un servicio de geocodificación con mejor SLA si el volumen es alto
- Los markers usan `L.divIcon` para personalizar colores sin necesidad de imágenes externas
- Responsive: en pantallas < 768px la lista se convierte en drawer deslizable
