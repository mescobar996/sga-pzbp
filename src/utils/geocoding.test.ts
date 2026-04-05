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
