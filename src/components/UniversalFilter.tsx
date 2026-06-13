import React from 'react';
import { Search, Calendar } from 'lucide-react';

export interface UniversalFilterProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (value: string) => void;
  categories: string[];
  selectedLocation?: string;
  onLocationChange?: (value: string) => void;
  locations?: { id: string; name: string }[];
  startDate?: string;
  onStartDateChange?: (value: string) => void;
  endDate?: string;
  onEndDateChange?: (value: string) => void;
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
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
}) => {
  const commonStyles =
    'p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none font-black uppercase text-xs shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]';

  return (
    <div className="flex flex-col gap-4 mb-6 border-b-4 border-[#1a1a1a] pb-6 bg-[#f5f0e8] p-4">
      {/* Fila 1: Búsqueda, Ubicación y Fechas */}
      <div className="flex flex-wrap gap-4">
        <div className="relative flex-1 min-w-[200px]">
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
            className={`${commonStyles} cursor-pointer min-w-[150px]`}
          >
            {locations.map((l) => (
              <option key={l.id} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
        )}
        
        {onStartDateChange && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1a1a1a]" />
            <input
              type="date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              className={`${commonStyles} min-w-[140px]`}
            />
          </div>
        )}
        
        {onEndDateChange && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1a1a1a]" />
            <input
              type="date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              className={`${commonStyles} min-w-[140px]`}
            />
          </div>
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
