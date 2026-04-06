import { useMap } from 'react-leaflet';
import { useEffect } from 'react';
import L from 'leaflet';
import 'leaflet.heat';

interface HeatmapLayerProps {
  points: [number, number, number][]; // [lat, lng, intensity]
  radius?: number;
  blur?: number;
  maxZoom?: number;
}

export default function HeatmapLayer({ points, radius = 25, blur = 15, maxZoom = 18 }: HeatmapLayerProps) {
  const map = useMap();

  useEffect(() => {
    if (!map || points.length === 0) return;

    const heat = L.heatLayer(points, {
      radius,
      blur,
      maxZoom,
      gradient: {
        0.0: '#0055ff',
        0.3: '#00cc66',
        0.6: '#f59e0b',
        0.8: '#e63b2e',
        1.0: '#8b5cf6',
      },
    }).addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [map, points, radius, blur, maxZoom]);

  return null;
}
