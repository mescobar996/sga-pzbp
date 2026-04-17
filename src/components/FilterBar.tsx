import React from 'react';
import { Search, X } from 'lucide-react';

export interface FilterOption {
  label: string;
  value: string;
}

interface FilterProps {
  value: string;
  onChange: (val: string) => void;
  options?: (FilterOption | string)[];
  placeholder?: string;
  title?: string;
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
    };
    to: {
      value: string;
      onChange: (val: string) => void;
    };
  };
  sort?: {
    value: string;
    onChange: (val: string) => void;
    options: FilterOption[];
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
  const commonStyles =
    "p-2 sm:p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-[10px] sm:text-sm h-full w-full mb-1";

  return (
    <div className="mb-6 flex flex-col gap-4">
      {/* Search Row */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-4 h-4 sm:w-5 h-5 text-[#1a1a1a] opacity-50" />
        </div>
        <input
          type="text"
          value={search.value}
          onChange={(e) => search.onChange(e.target.value)}
          placeholder={search.placeholder || "BUSCAR..."}
          autoComplete="off"
          className={`${commonStyles} pl-9 sm:pl-10 !shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]`}
        />
      </div>

      {/* Filters Row - Responsive Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:flex lg:flex-wrap gap-2 sm:gap-4 items-end">
        {filters.map((filter, idx) => (
          <div key={idx} className="flex-1 min-w-[140px] lg:min-w-[180px] lg:max-w-[220px]">
            {filter.type === 'select' ? (
              <select
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                className={`${commonStyles} cursor-pointer`}
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
          <>
            <div className="flex-1 min-w-[140px] lg:min-w-[160px]">
              <input
                type="date"
                value={dateRange.from.value}
                onChange={(e) => dateRange.from.onChange(e.target.value)}
                title="Vencimiento desde"
                className={`${commonStyles} cursor-pointer`}
              />
            </div>
            <div className="flex-1 min-w-[140px] lg:min-w-[160px]">
              <input
                type="date"
                value={dateRange.to.value}
                onChange={(e) => dateRange.to.onChange(e.target.value)}
                title="Vencimiento hasta"
                className={`${commonStyles} cursor-pointer`}
              />
            </div>
          </>
        )}

        {/* Sort Filter */}
        {sort && (
          <div className="flex-1 min-w-[140px] lg:min-w-[200px]">
            <select
              value={sort.value}
              onChange={(e) => sort.onChange(e.target.value)}
              className={`${commonStyles} cursor-pointer`}
            >
              {sort.options.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clear Button */}
        {onClear && (
          <button
            onClick={onClear}
            className="flex-none p-2 sm:p-3 border-2 border-[#e63b2e] bg-white text-[#e63b2e] hover:bg-[#e63b2e] hover:text-white transition-all font-bold uppercase text-[10px] sm:text-xs shadow-[3px_3px_0px_0px_rgba(230,59,46,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none min-h-[40px] sm:min-h-[46px] mb-1 whitespace-nowrap"
          >
            Limpiar
          </button>
        )}
      </div>
    </div>
  );
};
