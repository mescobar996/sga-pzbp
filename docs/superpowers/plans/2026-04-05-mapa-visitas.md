# Mapa de Visitas Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Agregar un mapa interactivo de visitas con coordenadas geográficas para los Orígenes/Destinos, permitiendo visualizar en un mapa todas las ubicaciones y las rutas de las visitas registradas.

**Architecture:** Two-phase approach: Phase 1 adds coordinate fields (latitude/longitude) to the existing `Location` type and integrates a map picker into the BaseDatos CRUD. Phase 2 creates a new `/mapa-visitas` page with a split layout (filterable visit list + Leaflet map). Uses Leaflet + react-leaflet for maps and Nominatim API for geocoding (both free, no API key required).

**Tech Stack:** React 19, TypeScript, Leaflet, react-leaflet, Nominatim API, Firebase Firestore, Tailwind CSS 4

---

## File Map

| Action | File                                        | Responsibility                                               |
| ------ | ------------------------------------------- | ------------------------------------------------------------ |
| Modify | `src/types/index.ts:66-73`                  | Add `latitude?` and `longitude?` to `Location` interface     |
| Modify | `src/utils/validation.ts:34-38`             | Add optional lat/lng to `locationSchema`                     |
| Create | `src/utils/geocoding.ts`                    | Nominatim geocoding utility function                         |
| Create | `src/utils/geocoding.test.ts`               | Tests for geocoding utility                                  |
| Create | `src/components/LocationMapPicker.tsx`      | Modal with interactive map for selecting coordinates         |
| Create | `src/components/LocationMapPicker.test.tsx` | Tests for LocationMapPicker                                  |
| Modify | `src/pages/BaseDatos.tsx`                   | Integrate map picker into location CRUD, add lat/lng to form |
| Create | `src/pages/MapaVisitas.tsx`                 | New page: visit list + interactive map                       |
| Modify | `src/App.tsx`                               | Add lazy import and route for `/mapa-visitas`                |
| Modify | `src/components/Layout.tsx`                 | Add nav item for Mapa de Visitas                             |

---

## Task 1: Install Dependencies

- [ ] **Step 1: Install leaflet, react-leaflet, and @types/leaflet**

Run:

```bash
npm install leaflet react-leaflet && npm install -D @types/leaflet
```

- [ ] **Step 2: Verify build still passes**

Run:

```bash
npm run build
```

Expected: Build succeeds with no new errors.

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add leaflet and react-leaflet dependencies"
```

---

## Task 2: Update Location Type and Validation Schema

**Files:**

- Modify: `src/types/index.ts:66-73`
- Modify: `src/utils/validation.ts:34-38`

- [ ] **Step 1: Update the Location interface**

In `src/types/index.ts`, replace lines 66-73:

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

- [ ] **Step 2: Update the locationSchema**

In `src/utils/validation.ts`, replace lines 34-38:

```typescript
export const locationSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100, 'Maximo 100 caracteres'),
  type: z.enum(['Origen', 'Destino', 'Origen/Destino']),
  status: z.enum(['Operativo', 'Mantenimiento', 'Inactivo']),
  latitude: z.number().min(-90).max(90).optional().or(z.undefined()),
  longitude: z.number().min(-180).max(180).optional().or(z.undefined()),
});
```

- [ ] **Step 3: Run tests and build**

```bash
npm run test:run && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts src/utils/validation.ts
git commit -m "feat: add latitude/longitude fields to Location type and schema"
```

---

## Task 3: Create Geocoding Utility

**Files:**

- Create: `src/utils/geocoding.ts`
- Create: `src/utils/geocoding.test.ts`

- [ ] **Step 1: Write tests `src/utils/geocoding.test.ts`**

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { geocodeAddress } from './geocoding';

const mockFetch = vi.fn();

beforeEach(() => {
  global.fetch = mockFetch;
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe('geocodeAddress', () => {
  it('should return coordinates for a valid address', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([{ lat: '-34.6037', lon: '-58.3816' }]),
    });
    const result = await geocodeAddress('Buenos Aires, Argentina');
    expect(result).toEqual({ lat: -34.6037, lng: -58.3816 });
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining('nominatim.openstreetmap.org/search'),
      expect.objectContaining({ headers: { 'User-Agent': 'SGA-PZBP/1.0' } }),
    );
  });

  it('should return null when no results found', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    const result = await geocodeAddress('NonExistentPlaceXYZ123');
    expect(result).toBeNull();
  });

  it('should return null on fetch error', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));
    const result = await geocodeAddress('Buenos Aires');
    expect(result).toBeNull();
  });

  it('should return null on non-ok response', async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 429 });
    const result = await geocodeAddress('Buenos Aires');
    expect(result).toBeNull();
  });

  it('should include countrycodes=ar in the request URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await geocodeAddress('Cordoba');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('countrycodes=ar');
  });

  it('should include limit=1 in the request URL', async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve([]) });
    await geocodeAddress('Cordoba');
    const callUrl = mockFetch.mock.calls[0][0] as string;
    expect(callUrl).toContain('limit=1');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/utils/geocoding.test.ts
```

- [ ] **Step 3: Create `src/utils/geocoding.ts`**

```typescript
export interface GeocodeResult {
  lat: number;
  lng: number;
}

export async function geocodeAddress(query: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&countrycodes=ar&limit=1`;
    const response = await fetch(url, { headers: { 'User-Agent': 'SGA-PZBP/1.0' } });
    if (!response.ok) return null;
    const data = await response.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/utils/geocoding.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add src/utils/geocoding.ts src/utils/geocoding.test.ts
git commit -m "feat: add Nominatim geocoding utility with tests"
```

---

## Task 4: Create LocationMapPicker Component

**Files:**

- Create: `src/components/LocationMapPicker.tsx`
- Create: `src/components/LocationMapPicker.test.tsx`

- [ ] **Step 1: Write tests `src/components/LocationMapPicker.test.tsx`**

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationMapPicker from './LocationMapPicker';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMapEvents: () => ({}),
}));

vi.mock('leaflet', () => ({
  Icon: { Default: { prototype: { _getIconUrl: '' }, mergeOptions: vi.fn() } },
}));

const mockOnClose = vi.fn();
const mockOnSelect = vi.fn();
beforeEach(() => { vi.clearAllMocks(); });

describe('LocationMapPicker', () => {
  it('should not render when isOpen is false', () => {
    render(<LocationMapPicker isOpen={false} onClose={mockOnClose} onSelect={mockOnSelect} />);
    expect(screen.queryByTestId('map-container')).not.toBeInTheDocument();
  });

  it('should render map container when isOpen is true', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('should show close button that calls onClose', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
    fireEvent.click(screen.getByRole('button', { name: /cerrar/i }));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('should show address search input', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText(/buscar dirección/i)).toBeInTheDocument();
  });

  it('should show manual lat/lng inputs', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
    expect(screen.getByLabelText(/latitud/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/longitud/i)).toBeInTheDocument();
  });

  it('should call onSelect with coordinates when "Usar esta ubicación" is clicked', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} initialLat={-34.6} initialLng={-58.3} />);
    fireEvent.click(screen.getByRole('button', { name: /usar esta ubicación/i }));
    expect(mockOnSelect).toHaveBeenCalledWith(-34.6, -58.3);
  });

  it('should disable "Usar esta ubicación" when no coordinates selected', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /usar esta ubicación/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npm run test:run -- src/components/LocationMapPicker.test.tsx
```

- [ ] **Step 3: Create `src/components/LocationMapPicker.tsx`**

```tsx
import { useState, useCallback, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { X, Search, MapPin } from 'lucide-react';
import { geocodeAddress } from '../utils/geocoding';
import 'leaflet/dist/leaflet.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

interface LocationMapPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (lat: number, lng: number) => void;
  initialLat?: number;
  initialLng?: number;
}

function MapClickHandler({ onMapClick }: { onMapClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function LocationMapPicker({
  isOpen,
  onClose,
  onSelect,
  initialLat,
  initialLng,
}: LocationMapPickerProps) {
  const [lat, setLat] = useState<number | undefined>(initialLat);
  const [lng, setLng] = useState<number | undefined>(initialLng);
  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleMapClick = useCallback((clickedLat: number, clickedLng: number) => {
    setLat(clickedLat);
    setLng(clickedLng);
  }, []);

  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim() || query.trim().length < 3) return;
    setSearching(true);
    const result = await geocodeAddress(query);
    setSearching(false);
    if (result) {
      setLat(result.lat);
      setLng(result.lng);
    }
  }, []);

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (value.trim().length >= 3) {
      searchTimeoutRef.current = setTimeout(() => {
        handleSearch(value);
      }, 1000);
    }
  };

  const handleUseLocation = () => {
    if (lat !== undefined && lng !== undefined) onSelect(lat, lng);
  };

  if (!isOpen) return null;

  const center: [number, number] = lat !== undefined && lng !== undefined ? [lat, lng] : [-34.6037, -58.3816];

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b-4 border-[#1a1a1a] bg-[#f5f0e8]">
          <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
            <MapPin className="w-5 h-5" /> Ubicar en Mapa
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]"
            aria-label="Cerrar"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        <div className="p-4 border-b-2 border-[#1a1a1a]/10 flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#1a1a1a]/40" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar dirección o lugar..."
              className="w-full pl-10 pr-3 py-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm uppercase transition-colors"
            />
            {searching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
        <div className="flex-1 min-h-[400px] relative">
          <MapContainer
            center={center}
            zoom={lat !== undefined ? 14 : 6}
            style={{ width: '100%', height: '100%' }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            {lat !== undefined && lng !== undefined && (
              <Marker position={[lat, lng]}>
                <Popup>
                  <div className="text-center font-bold">
                    <p className="text-sm">Ubicación seleccionada</p>
                    <p className="text-xs opacity-60">
                      {lat.toFixed(4)}, {lng.toFixed(4)}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
        <div className="p-4 border-t-4 border-[#1a1a1a] bg-[#f5f0e8]">
          <div className="flex flex-col sm:flex-row gap-3 items-end">
            <div className="flex-1 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Latitud</label>
                <input
                  type="number"
                  step="any"
                  value={lat ?? ''}
                  onChange={(e) => setLat(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="-34.6037"
                  className="w-full p-2 border-2 border-[#1a1a1a] bg-white focus:outline-none font-bold text-sm font-mono"
                  aria-label="Latitud"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase tracking-widest mb-1">Longitud</label>
                <input
                  type="number"
                  step="any"
                  value={lng ?? ''}
                  onChange={(e) => setLng(e.target.value ? parseFloat(e.target.value) : undefined)}
                  placeholder="-58.3816"
                  className="w-full p-2 border-2 border-[#1a1a1a] bg-white focus:outline-none font-bold text-sm font-mono"
                  aria-label="Longitud"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="px-6 py-3 border-2 border-[#1a1a1a] bg-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleUseLocation}
                disabled={lat === undefined || lng === undefined}
                className="px-6 py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)]"
              >
                Usar esta ubicación
              </button>
            </div>
          </div>
          <p className="text-[10px] font-bold opacity-50 mt-2">
            Hacé click en el mapa para seleccionar coordenadas, o buscá una dirección arriba.
          </p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm run test:run -- src/components/LocationMapPicker.test.tsx
```

- [ ] **Step 5: Run build**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add src/components/LocationMapPicker.tsx src/components/LocationMapPicker.test.tsx
git commit -m "feat: add LocationMapPicker component with map-based coordinate selection"
```

---

## Task 5: Integrate Map Picker into BaseDatos

**Files:**

- Modify: `src/pages/BaseDatos.tsx`

- [ ] **Step 1: Add imports**

After existing lucide imports, add `Crosshair` to the list. After line 36, add:

```typescript
import LocationMapPicker from '../components/LocationMapPicker';
```

- [ ] **Step 2: Update locationForm state**

Replace line 83:

```typescript
const [locationForm, setLocationForm] = useState({
  name: '',
  type: 'Origen',
  status: 'Operativo',
  latitude: undefined as number | undefined,
  longitude: undefined as number | undefined,
});
```

- [ ] **Step 3: Add state for map picker modal**

After line 79 (after `editingLocation` state), add:

```typescript
const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
```

- [ ] **Step 4: Update handleSaveLocation to include lat/lng**

Replace the `handleSaveLocation` function (lines 191-220) with:

```typescript
const handleSaveLocation = async (e: React.FormEvent) => {
  e.preventDefault();
  if (!auth.currentUser) return;
  const result = locationSchema.safeParse(locationForm);
  if (!result.success) {
    result.error.issues.forEach((err) => toast.error(err.message));
    return;
  }
  try {
    const coords: Record<string, number | undefined> = {};
    if (locationForm.latitude !== undefined) coords.latitude = locationForm.latitude;
    if (locationForm.longitude !== undefined) coords.longitude = locationForm.longitude;
    if (editingLocation) {
      await updateDoc(doc(db, 'locations', editingLocation.id), {
        name: result.data.name,
        type: result.data.type,
        status: result.data.status,
        ...coords,
      });
      toast.success('Ubicación actualizada');
    } else {
      await addDoc(collection(db, 'locations'), {
        ...result.data,
        ...coords,
        createdAt: new Date().toISOString(),
        authorId: auth.currentUser.uid,
      });
      toast.success('Ubicación añadida');
    }
    setIsLocationModalOpen(false);
  } catch (error) {
    handleFirestoreError(error, editingLocation ? OperationType.UPDATE : OperationType.CREATE, 'locations');
  }
};
```

- [ ] **Step 5: Update onEdit handler to include lat/lng**

Replace the onEdit handler for locations (around line 607-609):

```typescript
onEdit={(l) => {
  setEditingLocation(l);
  setLocationForm({ name: l.name, type: l.type, status: l.status, latitude: l.latitude, longitude: l.longitude });
  setIsLocationModalOpen(true);
}}
```

- [ ] **Step 6: Add map picker button and coordinate preview to location modal**

In the location modal form (inside `{isLocationModalOpen && ...}` around line 832), add this block BEFORE the submit button:

```tsx
<div>
  <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Ubicación en Mapa</label>
  <div className="flex gap-2 items-center">
    <button
      type="button"
      onClick={() => setIsMapPickerOpen(true)}
      className="flex-1 py-3 border-4 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-sm tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] flex items-center justify-center gap-2"
    >
      <Crosshair className="w-4 h-4" />{' '}
      {locationForm.latitude && locationForm.longitude ? 'Cambiar ubicación' : 'Seleccionar en mapa'}
    </button>
  </div>
  {locationForm.latitude && locationForm.longitude && (
    <p className="text-xs font-bold opacity-60 mt-1 font-mono">
      📍 {locationForm.latitude.toFixed(4)}, {locationForm.longitude.toFixed(4)}
    </p>
  )}
</div>
```

- [ ] **Step 7: Add LocationMapPicker modal at the end of the component**

Before the closing `</div>` of the main return, add:

```tsx
{
  isMapPickerOpen && (
    <LocationMapPicker
      isOpen={isMapPickerOpen}
      onClose={() => setIsMapPickerOpen(false)}
      onSelect={(lat, lng) => {
        setLocationForm({ ...locationForm, latitude: lat, longitude: lng });
        setIsMapPickerOpen(false);
      }}
      initialLat={locationForm.latitude}
      initialLng={locationForm.longitude}
    />
  );
}
```

- [ ] **Step 8: Run tests and build**

```bash
npm run test:run && npm run build
```

- [ ] **Step 9: Commit**

```bash
git add src/pages/BaseDatos.tsx
git commit -m "feat: integrate map picker into location CRUD in BaseDatos"
```

---

## Task 6: Create MapaVisitas Page

**Files:**

- Create: `src/pages/MapaVisitas.tsx`

- [ ] **Step 1: Create the page `src/pages/MapaVisitas.tsx`**

```tsx
import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import type { Location, Visita } from '../types';
import { Calendar, User, MapPin, X } from 'lucide-react';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapUpdater({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [map, center, zoom]);
  return null;
}

export default function MapaVisitas() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [visitas, setVisitas] = useState<Visita[]>([]);
  const [selectedVisita, setSelectedVisita] = useState<Visita | null>(null);
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterResponsable, setFilterResponsable] = useState('');
  const [filterOrigen, setFilterOrigen] = useState('');
  const [filterDestino, setFilterDestino] = useState('');
  const [showList, setShowList] = useState(true);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    const unsubLoc = onSnapshot(query(collection(db, 'locations'), orderBy('name')), (snap) => {
      setLocations(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Location));
    });
    const unsubVis = onSnapshot(query(collection(db, 'visitas'), orderBy('createdAt', 'desc')), (snap) => {
      setVisitas(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Visita));
    });
    return () => {
      unsubLoc();
      unsubVis();
    };
  }, []);

  const responsables = [...new Set(visitas.map((v) => v.responsable))].sort();
  const origenes = [...new Set(visitas.map((v) => v.origen))].sort();
  const destinos = [...new Set(visitas.map((v) => v.destino))].sort();

  const filteredVisitas = visitas.filter((v) => {
    if (filterDateFrom && v.fecha < filterDateFrom) return false;
    if (filterDateTo && v.fecha > filterDateTo) return false;
    if (filterResponsable && v.responsable !== filterResponsable) return false;
    if (filterOrigen && v.origen !== filterOrigen) return false;
    if (filterDestino && v.destino !== filterDestino) return false;
    return true;
  });

  const locationsWithCoords = locations.filter((l) => l.latitude !== undefined && l.longitude !== undefined);

  const getMarkerIcon = (type: string) => {
    if (type === 'Origen') return greenIcon;
    if (type === 'Destino') return redIcon;
    return orangeIcon;
  };

  const getSelectedRoute = () => {
    if (!selectedVisita) return null;
    const origenLoc = locations.find((l) => l.name.toUpperCase() === selectedVisita.origen.toUpperCase());
    const destinoLoc = locations.find((l) => l.name.toUpperCase() === selectedVisita.destino.toUpperCase());
    if (origenLoc?.latitude && origenLoc?.longitude && destinoLoc?.latitude && destinoLoc?.longitude) {
      return [
        [origenLoc.latitude, origenLoc.longitude],
        [destinoLoc.latitude, destinoLoc.longitude],
      ] as [number, number][];
    }
    return null;
  };

  const getSelectedCenter = (): [number, number] | null => {
    const route = getSelectedRoute();
    if (route) return [(route[0][0] + route[1][0]) / 2, (route[0][1] + route[1][1]) / 2];
    return null;
  };

  const hasAnyCoords = locationsWithCoords.length > 0;
  const mapCenter: [number, number] = getSelectedCenter() || [-34.6037, -58.3816];
  const mapZoom = selectedVisita ? 10 : 6;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col lg:flex-row gap-4">
      {/* Mobile toggle */}
      <button
        onClick={() => setShowList(!showList)}
        className="lg:hidden fixed top-24 right-4 z-[1000] p-3 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(0,85,255,1)]"
      >
        {showList ? <X className="w-5 h-5" /> : <MapPin className="w-5 h-5" />}
      </button>

      {/* List Panel */}
      <div
        className={`${showList ? 'flex' : 'hidden'} lg:flex flex-col w-full lg:w-[30%] lg:min-w-[320px] bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(0,85,255,1)] overflow-hidden`}
      >
        <div className="p-4 border-b-4 border-[#1a1a1a] bg-[#f5f0e8]">
          <h1 className="text-xl font-black uppercase font-['Space_Grotesk']">Mapa de Visitas</h1>
          <p className="text-xs font-bold opacity-50 mt-1">
            {filteredVisitas.length} visita{filteredVisitas.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filters */}
        <div className="p-3 border-b-2 border-[#1a1a1a]/10 space-y-2 overflow-y-auto">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Desde</label>
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none text-xs font-bold"
              />
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Hasta</label>
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none text-xs font-bold"
              />
            </div>
          </div>
          <div>
            <label className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Responsable</label>
            <select
              value={filterResponsable}
              onChange={(e) => setFilterResponsable(e.target.value)}
              className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none text-xs font-bold uppercase"
            >
              <option value="">Todos</option>
              {responsables.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Origen</label>
              <select
                value={filterOrigen}
                onChange={(e) => setFilterOrigen(e.target.value)}
                className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none text-xs font-bold uppercase"
              >
                <option value="">Todos</option>
                {origenes.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase tracking-widest opacity-60 mb-1">Destino</label>
              <select
                value={filterDestino}
                onChange={(e) => setFilterDestino(e.target.value)}
                className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none text-xs font-bold uppercase"
              >
                <option value="">Todos</option>
                {destinos.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {(filterDateFrom || filterDateTo || filterResponsable || filterOrigen || filterDestino) && (
            <button
              onClick={() => {
                setFilterDateFrom('');
                setFilterDateTo('');
                setFilterResponsable('');
                setFilterOrigen('');
                setFilterDestino('');
                setSelectedVisita(null);
              }}
              className="w-full py-1.5 text-xs font-black uppercase text-[#e63b2e] hover:underline"
            >
              Limpiar filtros
            </button>
          )}
        </div>

        {/* Visit List */}
        <div className="flex-1 overflow-y-auto">
          {filteredVisitas.length === 0 ? (
            <div className="p-8 text-center">
              <MapPin className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm font-bold opacity-50">Sin visitas para mostrar</p>
            </div>
          ) : (
            filteredVisitas.map((v) => (
              <button
                key={v.id}
                onClick={() => {
                  setSelectedVisita(v);
                  if (window.innerWidth < 1024) setShowList(false);
                }}
                className={`w-full text-left p-3 border-b-2 border-[#1a1a1a]/10 transition-colors ${selectedVisita?.id === v.id ? 'bg-[#0055ff] text-white' : 'hover:bg-[#f5f0e8]'}`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="w-3 h-3 shrink-0" />
                  <span className="text-xs font-black uppercase">{v.fecha}</span>
                  <span className="text-[10px] font-bold opacity-50">{v.hora}</span>
                </div>
                <p className="text-xs font-bold uppercase truncate">
                  {v.origen} → {v.destino}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <User className="w-3 h-3 shrink-0" />
                  <span className="text-[10px] font-medium opacity-60 truncate">{v.responsable}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Map Panel */}
      <div className="flex-1 border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(0,85,255,1)] relative">
        {!hasAnyCoords && (
          <div className="absolute inset-0 z-[1000] bg-[#f5f0e8] flex items-center justify-center p-8">
            <div className="text-center">
              <MapPin className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] mb-2">Sin ubicaciones en el mapa</h2>
              <p className="text-sm font-bold opacity-50 max-w-md">
                Agregá coordenadas a los Orígenes/Destinos desde Base de Datos para verlos en el mapa.
              </p>
            </div>
          </div>
        )}
        <MapContainer
          center={mapCenter}
          zoom={mapZoom}
          style={{ width: '100%', height: '100%' }}
          scrollWheelZoom={true}
        >
          <MapUpdater center={mapCenter} zoom={mapZoom} />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {locationsWithCoords.map((loc) => (
            <Marker key={loc.id} position={[loc.latitude!, loc.longitude!]} icon={getMarkerIcon(loc.type)}>
              <Popup>
                <div className="font-bold text-center">
                  <p className="text-sm uppercase">{loc.name}</p>
                  <p className="text-xs opacity-60">{loc.type}</p>
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 text-[9px] font-black uppercase border ${loc.status === 'Operativo' ? 'bg-[#00cc66] text-white border-[#1a1a1a]' : loc.status === 'Mantenimiento' ? 'bg-[#0055ff] text-white border-[#1a1a1a]' : 'bg-[#e63b2e] text-white border-[#1a1a1a]'}`}
                  >
                    {loc.status}
                  </span>
                </div>
              </Popup>
            </Marker>
          ))}
          {getSelectedRoute() && (
            <Polyline positions={getSelectedRoute()!} color="#0055ff" weight={4} dashArray="10, 8" />
          )}
        </MapContainer>
        {selectedVisita && (
          <button
            onClick={() => setSelectedVisita(null)}
            className="absolute top-4 left-4 z-[1000] px-3 py-2 bg-white border-2 border-[#1a1a1a] text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] hover:bg-[#1a1a1a] hover:text-white transition-colors"
          >
            Limpiar selección
          </button>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Run build to verify TypeScript compiles**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/MapaVisitas.tsx
git commit -m "feat: create MapaVisitas page with visit list and interactive map"
```

---

## Task 7: Add Route and Navigation

**Files:**

- Modify: `src/App.tsx`
- Modify: `src/components/Layout.tsx`

- [ ] **Step 1: Add lazy import and route in App.tsx**

After line 19 (after `const DebugDB = lazy(...)`), add:

```typescript
const MapaVisitas = lazy(() => import('./pages/MapaVisitas'));
```

After the `debug-db` route block (before the closing `</Route>` for the Layout), add:

```tsx
<Route
  path="mapa-visitas"
  element={
    <PageTransition>
      <MapaVisitas />
    </PageTransition>
  }
/>
```

- [ ] **Step 2: Add nav item in Layout.tsx**

Import `Map` from lucide-react (add to existing imports at line 6-27):

```typescript
import { ..., Map } from 'lucide-react';
```

Add to `navItems` array (around line 405-412):

```typescript
{ to: '/mapa-visitas', icon: Map, label: 'Mapa de Visitas' },
```

- [ ] **Step 3: Run tests and build**

```bash
npm run test:run && npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/components/Layout.tsx
git commit -m "feat: add mapa-visitas route and navigation link"
```

---

## Self-Review

1. **Spec coverage:** All requirements covered - coordinate fields added to Location, map picker in BaseDatos, geocoding with Nominatim, new MapaVisitas page with filters + list + map, colored markers, route drawing, responsive layout.

2. **Placeholder scan:** No TBDs, no "add tests for the above" without actual test code, no "handle edge cases" without implementation.

3. **Type consistency:** `Location` type has `latitude?: number` and `longitude?: number` consistently used across all tasks. `locationForm` includes lat/lng. Schema validates them. MapaVisitas uses `Location` type correctly.
