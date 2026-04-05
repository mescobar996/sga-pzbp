import { memo } from 'react';
import { FileText, FileSpreadsheet, FileJson } from 'lucide-react';

type ReportFormat = 'pdf' | 'excel' | 'json';

interface FormatSelectorProps {
  value: ReportFormat;
  onChange: (format: ReportFormat) => void;
}

const formatConfig: Record<ReportFormat, { label: string; icon: typeof FileText; accent: string }> = {
  pdf: { label: 'PDF', icon: FileText, accent: '#e63b2e' },
  excel: { label: 'Excel', icon: FileSpreadsheet, accent: '#00cc66' },
  json: { label: 'JSON', icon: FileJson, accent: '#0055ff' },
};

export const FormatSelector = memo(function FormatSelector({ value, onChange }: FormatSelectorProps) {
  return (
    <div className="flex gap-2">
      {(Object.entries(formatConfig) as [ReportFormat, (typeof formatConfig)[ReportFormat]][]).map(
        ([format, { label, icon: Icon, accent }]) => (
          <button
            key={format}
            type="button"
            onClick={() => onChange(format)}
            className={`flex-1 py-3 border-2 border-[#1a1a1a] font-black uppercase tracking-widest transition-all text-xs flex items-center justify-center gap-2 ${
              value === format
                ? 'bg-[#1a1a1a] text-white'
                : 'text-white hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none'
            }`}
            style={value !== format ? { backgroundColor: accent, boxShadow: '3px 3px 0px 0px rgba(26,26,26,1)' } : {}}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ),
      )}
    </div>
  );
});
