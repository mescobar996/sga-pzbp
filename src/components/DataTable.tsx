import { memo } from 'react';
import { Edit, Trash2 } from 'lucide-react';

interface DataTableColumn<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  data: T[];
  columns: DataTableColumn<T>[];
  filterValue: string;
  filterField: string;
  filterOptions: string[];
  onFilterChange: (value: string) => void;
  onAdd: () => void;
  onEdit: (item: T) => void;
  onDelete: (item: T) => void;
  showActions?: boolean;
  addLabel?: string;
  accentColor?: string;
}

export function DataTable<T extends { id: string }>({
  data,
  columns,
  filterValue,
  filterField,
  filterOptions,
  onFilterChange,
  onAdd,
  onEdit,
  onDelete,
  showActions = true,
  addLabel = 'Añadir',
  accentColor = '#0055ff',
}: DataTableProps<T>) {
  const filteredData =
    filterValue === 'Todos' ? data : data.filter((item) => (item as any)[filterField] === filterValue);

  return (
    <div className="bg-white border-2 border-[#1a1a1a] p-3 sm:p-4 lg:p-6 shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col min-h-[300px]">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-3 sm:mb-4 border-b-2 border-[#1a1a1a] pb-2 gap-2">
        <div className="flex gap-2 items-center flex-wrap">
          <select
            value={filterValue}
            onChange={(e) => onFilterChange(e.target.value)}
            className="text-xs font-bold uppercase border-2 border-[#1a1a1a] p-1.5 bg-[#f5f0e8] focus:outline-none min-h-[44px]"
          >
            {filterOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
          <button
            onClick={onAdd}
            className="px-3 py-2 min-h-[44px] border-2 border-[#1a1a1a] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
            style={{ backgroundColor: accentColor }}
          >
            {addLabel}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto flex-1 -mx-3 sm:mx-0">
        <table className="w-full text-left border-collapse min-w-[600px]">
          <thead>
            <tr className="border-b-2 border-[#1a1a1a] bg-[#f5f0e8]">
              {columns.map((col) => (
                <th key={col.key} className="p-2 sm:p-3 font-black uppercase tracking-widest text-[10px] sm:text-xs">
                  {col.label}
                </th>
              ))}
              {showActions && <th className="p-2 sm:p-3 font-black uppercase tracking-widest text-[10px] sm:text-xs text-right">Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredData.map((item) => (
              <tr
                key={item.id}
                className="border-b border-[#1a1a1a]/20 hover:bg-[#0055ff] hover:text-white transition-colors"
              >
                {columns.map((col) => (
                  <td key={col.key} className="p-2 sm:p-3 font-bold uppercase text-[10px] sm:text-sm">
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
                {showActions && (
                  <td className="p-2 sm:p-3 flex sm:justify-end gap-1.5 sm:gap-2">
                    <button
                      onClick={() => onEdit(item)}
                      className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center p-1.5 sm:p-1.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#0055ff] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      title="Editar"
                    >
                      <Edit className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item)}
                      className="min-w-[44px] min-h-[44px] sm:min-w-[36px] sm:min-h-[36px] flex items-center justify-center p-1.5 sm:p-1.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                      title="Eliminar"
                    >
                      <Trash2 className="w-4 h-4 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {filteredData.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length + (showActions ? 1 : 0)}
                  className="p-4 sm:p-6 text-center font-black uppercase text-xs sm:text-sm opacity-50"
                >
                  No hay registros
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
