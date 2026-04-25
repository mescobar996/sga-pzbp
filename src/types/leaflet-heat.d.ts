import 'leaflet';

declare module 'leaflet' {
  namespace heatLayer {
    function heat(
      latlngs: [number, number, number][],
      options?: {
        radius?: number;
        blur?: number;
        maxZoom?: number;
        max?: number;
        gradient?: Record<number, string>;
      }
    ): L.Layer;
  }
}
