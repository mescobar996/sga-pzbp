import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Map as MapIcon, Calendar, User } from 'lucide-react';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => { map.invalidateSize(); }, 200);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

export function OperationalMap({ data }: { data: any[] }) {
  return (
    <div className="border-2 border-[#1a1a1a] bg-white p-6">
      <h3 className="text-sm font-black uppercase tracking-widest flex items-center gap-2 mb-6">
        <MapIcon className="w-4 h-4" /> MAPA OPERATIVO
      </h3>
      <div className="h-[400px] border-2 border-[#1a1a1a] relative">
        <MapContainer center={[-33.25, -60.1]} zoom={10} style={{ height: '100%', width: '100%' }} zoomControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <MapResizer />
          {(data || []).map((v, i) => (
            <Marker key={i} position={[v.coords!.latitude!, v.coords!.longitude!]}>
              <Popup>
                <div className="font-['Inter'] text-[10px]">
                  <p className="font-black uppercase text-[#00cc66] mb-0.5">VISITA</p>
                  <h4 className="font-black uppercase mb-1">{v.destino}</h4>
                  <div className="flex gap-1 opacity-70"><Calendar className="w-3 h-3" /> {v.fecha}</div>
                  <div className="flex gap-1 font-bold"><User className="w-3 h-3" /> {v.responsable}</div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
