import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LocationMapPicker from './LocationMapPicker';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: { children: React.ReactNode }) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: { children: React.ReactNode }) => <div data-testid="popup">{children}</div>,
  useMapEvents: () => ({
    flyTo: vi.fn(),
    invalidateSize: vi.fn(),
  }),
}));

vi.mock('leaflet', () => {
  const MockIcon = vi.fn().mockImplementation(() => ({}));
  (MockIcon as any).Default = { prototype: { _getIconUrl: '' }, mergeOptions: vi.fn() };
  return { default: { Icon: MockIcon } };
});

const mockOnClose = vi.fn();
const mockOnSelect = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
});

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
    render(
      <LocationMapPicker
        isOpen={true}
        onClose={mockOnClose}
        onSelect={mockOnSelect}
        initialLat={-34.6}
        initialLng={-58.3}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /usar esta ubicación/i }));
    expect(mockOnSelect).toHaveBeenCalledWith(-34.6, -58.3);
  });

  it('should disable "Usar esta ubicación" when no coordinates selected', () => {
    render(<LocationMapPicker isOpen={true} onClose={mockOnClose} onSelect={mockOnSelect} />);
    expect(screen.getByRole('button', { name: /usar esta ubicación/i })).toBeDisabled();
  });
});
