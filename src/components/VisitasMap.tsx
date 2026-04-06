import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, ArrowRight, User, Calendar, Clock } from 'lucide-react';
import React, { useEffect } from 'react';

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Custom icons
const originIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Visita {
  id: string;
  origen: string;
  destino: string;
  fecha: string;
  hora: string;
  responsable: string;
  observaciones?: string;
}

interface LocationData {
  id: string;
  name: string;
  type: string;
  latitude?: number;
  longitude?: number;
}

interface VisitasMapProps {
  visitas: Visita[];
  locations: LocationData[];
}

export default function VisitasMap({ visitas, locations }: VisitasMapProps) {
  // Create a map of location names to coordinates
  // Convert names to uppercase for robust matching, as Visitas stores them in uppercase
  const locMap = new Map<string, { lat: number; lng: number }>();
  locations.forEach(l => {
    // Strict check: must be finite numbers (rejects null, undefined, NaN, Infinity)
    if (typeof l.latitude === 'number' && typeof l.longitude === 'number' && isFinite(l.latitude) && isFinite(l.longitude)) {
      locMap.set(l.name.toUpperCase(), { lat: l.latitude, lng: l.longitude });
    }
  });

  // Calculate default center - always use validated coordinates
  let center: [number, number] = [-34.6037, -58.3816]; // Default to Buenos Aires
  if (locations.length > 0) {
    const validLoc = locations.find(l => typeof l.latitude === 'number' && typeof l.longitude === 'number' && isFinite(l.latitude) && isFinite(l.longitude));
    if (validLoc) {
      center = [validLoc.latitude as number, validLoc.longitude as number];
    }
  }

  // Filter out visits that don't have coordinates for both origin and destination
  const mapVisitas = visitas.map(v => {
    const origCoords = locMap.get(v.origen.toUpperCase());
    const destCoords = locMap.get(v.destino.toUpperCase());
    return {
      ...v,
      origCoords,
      destCoords
    };
  }).filter(v => v.origCoords || v.destCoords); // Keep if they have at least one valid coordinate

  if (mapVisitas.length === 0) {
    return (
      <div className="w-full h-full min-h-[400px] flex items-center justify-center bg-[#f5f0e8] border-2 sm:border-4 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]">
        <div className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm font-black uppercase tracking-widest opacity-50">No hay visitas con coordenadas de mapa validas</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[500px] sm:h-[600px] border-2 sm:border-4 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] relative z-0">
      <MapContainer
        center={center}
        zoom={11}
        style={{ width: '100%', height: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <MapResizer />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapVisitas.map((visita, idx) => {
          const hasBoth = visita.origCoords && visita.destCoords;
          return (
            <div key={visita.id}>
              {/* Draw Polyline if both exist */}
              {hasBoth && (
                <Polyline 
                  positions={[
                    [visita.origCoords!.lat, visita.origCoords!.lng],
                    [visita.destCoords!.lat, visita.destCoords!.lng],
                  ]} 
                  pathOptions={{ color: '#0055ff', weight: 3, dashArray: '5, 10', opacity: 0.7 }}
                />
              )}

              {/* Marker for Origin */}
              {visita.origCoords && (
                <Marker position={[visita.origCoords.lat, visita.origCoords.lng]} icon={originIcon}>
                  <Popup>
                    <div className="font-['Inter']">
                      <p className="text-[10px] font-bold uppercase text-[#00cc66] mb-1">Origen</p>
                      <h4 className="font-black uppercase text-sm mb-2">{visita.origen}</h4>
                      <div className="flex gap-1 text-[10px] mb-1">
                        <Calendar className="w-3 h-3" /> {visita.fecha} <Clock className="w-3 h-3 ml-1" /> {visita.hora}
                      </div>
                      <div className="flex gap-1 text-[10px] font-bold">
                        <User className="w-3 h-3" /> {visita.responsable}
                      </div>
                      {hasBoth && (
                        <p className="text-[10px] mt-2 opacity-70 border-t pt-1">
                          Destino: {visita.destino}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}

              {/* Marker for Destination */}
              {visita.destCoords && (
                <Marker position={[visita.destCoords.lat, visita.destCoords.lng]} icon={destIcon}>
                  <Popup>
                    <div className="font-['Inter']">
                      <p className="text-[10px] font-bold uppercase text-[#e63b2e] mb-1">Destino</p>
                      <h4 className="font-black uppercase text-sm mb-2">{visita.destino}</h4>
                      <div className="flex gap-1 text-[10px] mb-1">
                        <Calendar className="w-3 h-3" /> {visita.fecha} <Clock className="w-3 h-3 ml-1" /> {visita.hora}
                      </div>
                      <div className="flex gap-1 text-[10px] font-bold">
                        <User className="w-3 h-3" /> {visita.responsable}
                      </div>
                      {hasBoth && (
                        <p className="text-[10px] mt-2 opacity-70 border-t pt-1">
                          Origen: {visita.origen}
                        </p>
                      )}
                    </div>
                  </Popup>
                </Marker>
              )}
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
