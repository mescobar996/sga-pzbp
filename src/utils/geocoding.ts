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
