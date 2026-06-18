import React, { useState } from 'react';
import { 
  Clock, 
  AlertCircle, 
  FileText, 
  Calendar, 
  Edit2, 
  Trash2 
} from 'lucide-react';
import { toast } from 'sonner';

interface TimelineItem {
  id: string;
  type: 'VISITA' | 'TAREA' | 'NOVEDAD' | 'DILIGENCIA';
  title: string;
  created_at: string;
  description?: string;
  author_name?: string;
  status?: string;
}

interface TimelineProps {
  items: TimelineItem[];
  locationName: string;
}

const getIcon = (type: string) => {
  switch (type) {
    case 'VISITA':
      return <Clock className="w-4 h-4 text-black" />;
    case 'TAREA':
    case 'NOVEDAD':
      return <AlertCircle className="w-4 h-4 text-black" />;
    case 'DILIGENCIA':
      return <FileText className="w-4 h-4 text-black" />;
    default:
      return <Clock className="w-4 h-4 text-black" />;
  }
};

const TimelineRow: React.FC<{ item: TimelineItem; locationName: string }> = ({ item, locationName }) => {
  const [status, setStatus] = useState(item.status ? item.status.toUpperCase() : 'PENDIENTE');

  const dateObj = item.created_at ? new Date(item.created_at) : null;
  const dateFormatted = dateObj && !isNaN(dateObj.getTime()) 
    ? dateObj.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : 'Fecha no disponible';

  const TYPE_LABELS: Record<string, string> = {
    VISITA:      'INFORME DE VISITA',
    TAREA:       'TAREA ASIGNADA',
    NOVEDAD:     'REPORTE DE NOVEDAD',
    DILIGENCIA:  'ACTA DE DILIGENCIA',
  };

  const isRedundantTitle =
    locationName &&
    item.title &&
    item.title.trim().toLowerCase() === locationName.trim().toLowerCase();

  const displayTitle = isRedundantTitle
    ? (TYPE_LABELS[item.type] ?? item.type)
    : item.title;

  return (
    <div className="w-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 mb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Izquierda/Centro */}
      <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
        {/* Ícono en una cajita cuadrada */}
        <div className="border-2 border-black p-1.5 bg-[#f5f0e8] flex items-center justify-center shrink-0 w-8 h-8">
          {getIcon(item.type)}
        </div>

        {/* Textos */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-black text-sm sm:text-base uppercase truncate">
              {displayTitle}
            </h3>
            <span className="border border-black px-1 text-[10px] font-bold uppercase bg-[#f5f0e8] shrink-0">
              {item.type}
            </span>
          </div>
          <p className="truncate text-xs text-gray-600">
            {item.description || 'Sin detalles adicionales.'}
          </p>
          <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-bold">
            <Calendar className="w-3.5 h-3.5" />
            {dateFormatted}
          </div>
        </div>
      </div>

      {/* Derecha (Acciones) */}
      <div className="flex items-center gap-2 shrink-0 justify-end">
        {item.status && (
          <select 
            value={status}
            onChange={(e) => {
              const newStatus = e.target.value;
              setStatus(newStatus);
              toast.success(`Estado de tarea cambiado a: ${newStatus}`);
            }}
            className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase bg-white focus:outline-none cursor-pointer"
          >
            <option value="PENDIENTE">PENDIENTE</option>
            <option value="EN_PROCESO">PROCESO</option>
            <option value="COMPLETADO">HECHO</option>
          </select>
        )}

        <button 
          onClick={() => toast.info(`La edición se realiza desde el módulo de ${item.type.toLowerCase()}s`)}
          className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-8 h-8 shrink-0"
          title="Editar"
        >
          <Edit2 className="w-4 h-4 text-black" />
        </button>
        <button 
          onClick={() => toast.error(`La eliminación se realiza desde el módulo de ${item.type.toLowerCase()}s`)}
          className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-8 h-8 shrink-0"
          title="Borrar"
        >
          <Trash2 className="w-4 h-4 text-black" />
        </button>
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ items, locationName }) => {
  if (!items || items.length === 0) {
    return <p className="text-center p-4 text-xs italic text-slate-400">Sin historial registrado para esta ubicación.</p>;
  }

  return (
    <div className="w-full">
      {items.map((item) => (
        <TimelineRow key={item.id} item={item} locationName={locationName} />
      ))}
    </div>
  );
};
