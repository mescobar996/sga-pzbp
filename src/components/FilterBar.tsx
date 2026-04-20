import React, { useState } from 'react';
import { Search, X, SlidersHorizontal, ChevronDown, ChevronUp, Calendar, ArrowUpDown, Filter, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterProps {
  value: string;
  onChange: (val: string) => void;
  options?: (FilterOption | string)[];
  placeholder?: string;
  title?: string; // Legacy support
  label?: string;
  type?: 'text' | 'select' | 'date';
}

interface FilterBarProps {
  search: {
    value: string;
    onChange: (val: string) => void;
    placeholder?: string;
  };
  filters?: FilterProps[];
  dateRange?: {
    from: {
      value: string;
      onChange: (val: string) => void;
      label?: string;
    };
    to: {
      value: string;
      onChange: (val: string) => void;
      label?: string;
    };
  };
  sort?: {
    value: string;
    onChange: (val: string) => void;
    options: FilterOption[];
    label?: string;
  };
  onClear?: () => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  filters = [],
  dateRange,
  sort,
  onClear,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const commonStyles =
    "p-2 sm:p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-[10px] sm:text-xs h-full w-full hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]";

  const labelStyles = "block text-[9px] sm:text-[10px] font-black uppercase tracking-tighter mb-1.5 ml-1 flex items-center gap-1.5";

  const hasActiveFilters = 
    filters.some(f => f.value !== 'todos' && f.value !== '') || 
    (dateRange && (dateRange.from.value !== '' || dateRange.to.value !== '')) ||
    (sort && sort.value !== sort.options[0]?.value);

  const activeFilterCount = 
    filters.filter(f => f.value !== 'todos' && f.value !== '').length +
    (dateRange?.from.value ? 1 : 0) +
    (dateRange?.to.value ? 1 : 0);

  return (
    <div className="mb-8 flex flex-col gap-4">
      {/* Search Header Row */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none z-10 group-focus-within:scale-110 transition-transform">
            <Search className="w-4 h-4 sm:w-5 h-5 text-[#1a1a1a]" />
          </div>
          <input
            type="text"
            value={search.value}
            onChange={(e) => search.onChange(e.target.value)}
            placeholder={search.placeholder || "BUSCAR..."}
            autoComplete="off"
            className={`${commonStyles} pl-11 sm:pl-12 !shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] sm:!shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] !text-sm sm:!text-base py-3 sm:py-4 placeholder-[#1a1a1a]/40`}
          />
        </div>
        
        <div className="flex gap-2 sm:gap-3">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className={`flex items-center gap-2 px-4 py-3 sm:py-4 border-2 border-[#1a1a1a] font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none text-[10px] sm:text-xs min-h-full whitespace-nowrap ${isExpanded ? 'bg-[#1a1a1a] text-white shadow-none translate-x-0.5 translate-y-0.5' : 'bg-white text-[#1a1a1a]'}`}
          >
            <SlidersHorizontal className={`w-4 h-4 ${isExpanded ? 'animate-pulse' : ''}`} />
            <span className="hidden sm:inline">Filtros</span>
            {activeFilterCount > 0 && !isExpanded && (
              <span className="ml-1 bg-[#0055ff] text-white w-5 h-5 rounded-full flex items-center justify-center text-[9px] border border-white">
                {activeFilterCount}
              </span>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
          </button>

          {onClear && (
            <button
              onClick={onClear}
              disabled={!hasActiveFilters && !search.value}
              className={`flex items-center gap-2 px-4 py-3 sm:py-4 border-2 border-[#1a1a1a] font-black uppercase tracking-widest transition-all shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-[10px] sm:text-xs disabled:opacity-30 disabled:cursor-not-allowed min-h-full whitespace-nowrap bg-white text-[#e63b2e] border-[#e63b2e] shadow-[#e63b2e] hover:bg-[#e63b2e] hover:text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none`}
            >
              <RotateCcw className="w-4 h-4" />
              <span className="hidden sm:inline">Reiniciar</span>
            </button>
          )}
        </div>
      </div>

      {/* Advanced Filters Drawer */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="overflow-hidden"
          >
            <div className="p-4 sm:p-6 bg-[#f5f0e8] border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mt-2">
              
              {/* Dynamic Filters */}
              {filters.map((filter, idx) => (
                <div key={idx} className="flex flex-col">
                  <label className={labelStyles}>
                    <Filter className="w-3 h-3" />
                    {filter.label || filter.placeholder || `Filtro ${idx + 1}`}
                  </label>
                  {filter.type === 'select' ? (
                    <select
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      className={`${commonStyles} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat pr-8`}
                    >
                      {filter.placeholder && <option value="todos">{filter.placeholder}</option>}
                      {filter.options?.map((opt) => {
                        const label = typeof opt === 'string' ? opt : opt.label;
                        const val = typeof opt === 'string' ? opt : opt.value;
                        return (
                          <option key={val} value={val}>
                            {label}
                          </option>
                        );
                      })}
                    </select>
                  ) : (
                    <input
                      type={filter.type || 'text'}
                      value={filter.value}
                      onChange={(e) => filter.onChange(e.target.value)}
                      placeholder={filter.placeholder}
                      className={commonStyles}
                    />
                  )}
                </div>
              ))}

              {/* Date Filters */}
              {dateRange && (
                <div className="sm:col-span-2 grid grid-cols-2 gap-3 sm:gap-4">
                  <div className="flex flex-col">
                    <label className={labelStyles}>
                      <Calendar className="w-3 h-3" />
                      {dateRange.from.label || "Desde"}
                    </label>
                    <input
                      type="date"
                      value={dateRange.from.value}
                      onChange={(e) => dateRange.from.onChange(e.target.value)}
                      className={`${commonStyles} cursor-pointer`}
                    />
                  </div>
                  <div className="flex flex-col">
                    <label className={labelStyles}>
                      <Calendar className="w-3 h-3 text-[#e63b2e]" />
                      {dateRange.to.label || "Hasta"}
                    </label>
                    <input
                      type="date"
                      value={dateRange.to.value}
                      onChange={(e) => dateRange.to.onChange(e.target.value)}
                      className={`${commonStyles} cursor-pointer`}
                    />
                  </div>
                </div>
              )}

              {/* Sort Filter */}
              {sort && (
                <div className="flex flex-col">
                  <label className={labelStyles}>
                    <ArrowUpDown className="w-3 h-3" />
                    {sort.label || "Ordenar por"}
                  </label>
                  <select
                    value={sort.value}
                    onChange={(e) => sort.onChange(e.target.value)}
                    className={`${commonStyles} cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C/polyline%3E%3C/svg%3E')] bg-[length:1em_1em] bg-[right_0.5rem_center] bg-no-repeat pr-8`}
                  >
                    {sort.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Badges */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-black uppercase text-[#1a1a1a]/50 ml-1 mr-1">Activos:</span>
          {filters.filter(f => f.value !== 'todos' && f.value !== '').map((f, i) => (
            <span key={i} className="px-2 py-1 bg-white border border-[#1a1a1a] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
              {f.value}
              <button onClick={() => f.onChange('todos')} className="hover:text-[#e63b2e]">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          {dateRange?.from.value && (
            <span className="px-2 py-1 bg-white border border-[#1a1a1a] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
              Desde: {dateRange.from.value}
              <button onClick={() => dateRange.from.onChange('')} className="hover:text-[#e63b2e]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
          {dateRange?.to.value && (
            <span className="px-2 py-1 bg-white border border-[#1a1a1a] text-[10px] font-bold uppercase flex items-center gap-1.5 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
              Hasta: {dateRange.to.value}
              <button onClick={() => dateRange.to.onChange('')} className="hover:text-[#e63b2e]">
                <X className="w-3 h-3" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

