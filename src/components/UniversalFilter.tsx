import React from 'react';
import { Search, Filter, RotateCcw } from 'lucide-react';

export interface UniversalFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  selectedLocation?: string;
  onLocationChange?: (value: string) => void;
  locations?: { id: string; name: string }[];
}

export const UniversalFilter: React.FC<UniversalFilterProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  categories,
  selectedLocation,
  onLocationChange,
  locations,
}) => {
  const commonStyles =
    'p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]';

  return (
    <div className="flex flex-col gap-4 mb-6 border-b-4 border-[#1a1a1a] pb-6 bg-[#f5f0e8] p-4">
      {/* Fila 1: Búsqueda y Ubicación */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-[#1a1a1a]" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="BUSCAR..."
            className={`${commonStyles} pl-10 w-full`}
          />
        </div>

        {locations && onLocationChange && (
          <select
            value={selectedLocation}
            onChange={(e) => onLocationChange(e.target.value)}
            className={`${commonStyles} cursor-pointer`}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Fila 2: Categorías */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => onCategoryChange(cat)}
            className={`px-4 py-2 font-black uppercase text-xs border-2 border-[#1a1a1a] transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] ${
              selectedCategory === cat
                ? 'bg-[#1a1a1a] text-white shadow-none translate-x-[1px] translate-y-[1px]'
                : 'bg-white hover:bg-slate-100 hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>
    </div>
  );
};
