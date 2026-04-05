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

function MapController({ lat, lng }: { lat: number | undefined, lng: number | undefined }) {
  const map = useMapEvents({
    click(e) {
      // we can handle clicks in the parent, or pass it here
    }
  });

  import('react').then((React) => {
    // 1. Force resize on mount for modal
    React.useEffect(() => {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }, [map]);

    // 2. Fly to when coords change
    React.useEffect(() => {
      if (lat !== undefined && lng !== undefined) {
        map.setView([lat, lng], map.getZoom() < 14 ? 14 : map.getZoom());
      }
    }, [lat, lng, map]);
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
        <div className="flex-1 min-h-[400px] relative bg-[#e5e5e5] z-0 overflow-hidden">
          <MapContainer
            center={center}
            zoom={lat !== undefined ? 14 : 6}
            style={{ width: '100%', height: '400px', zIndex: 0 }}
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapClickHandler onMapClick={handleMapClick} />
            <MapController lat={lat} lng={lng} />
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
