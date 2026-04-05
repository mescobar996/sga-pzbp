import { memo } from 'react';
import { Calendar } from 'lucide-react';

interface DateRangePickerProps {
  dateFrom: string;
  onDateFromChange: (value: string) => void;
  dateTo: string;
  onDateToChange: (value: string) => void;
}

export const DateRangePicker = memo(function DateRangePicker({
  dateFrom,
  onDateFromChange,
  dateTo,
  onDateToChange,
}: DateRangePickerProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Desde</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="w-4 h-4 text-[#1a1a1a] opacity-50" />
          </div>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => onDateFromChange(e.target.value)}
            className="w-full pl-9 p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Hasta</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Calendar className="w-4 h-4 text-[#1a1a1a] opacity-50" />
          </div>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => onDateToChange(e.target.value)}
            className="w-full pl-9 p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-xs"
          />
        </div>
      </div>
    </div>
  );
});
