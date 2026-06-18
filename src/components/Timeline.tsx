import React, { useState } from 'react';
import { 
  Star, 
  Clock, 
  AlertCircle, 
  FileText, 
  Calendar, 
  CheckSquare, 
  Edit2, 
  Upload, 
  Share2, 
  Copy, 
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
  const [isChecked, setIsChecked] = useState(false);
  const [isStarred, setIsStarred] = useState(false);
  const [status, setStatus] = useState('PENDIENTE');

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

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const text = `*${displayTitle}* [${item.type}]\n${item.description || 'Sin detalles adicionales.'}\nFecha: ${dateFormatted}\nAutor: ${item.author_name || '—'}`;
    try {
      if (navigator.share) {
        navigator.share({ title: displayTitle, text });
      } else {
        navigator.clipboard.writeText(text);
        toast.success('Información copiada al portapapeles');
      }
    } catch {
      navigator.clipboard.writeText(text);
      toast.success('Información copiada al portapapeles');
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.description || '');
    toast.success('Descripción copiada al portapapeles');
  };

  return (
    <div className="flex items-center justify-between w-full bg-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] p-3 mb-4 gap-4">
      {/* Sección Izquierda (Controles e Ícono) */}
      <div className="flex items-center gap-3 shrink-0">
        <input 
          type="checkbox" 
          checked={isChecked}
          onChange={(e) => setIsChecked(e.target.checked)}
          className="w-4 h-4 border-2 border-black rounded-none cursor-pointer accent-black shrink-0"
        />
        <button 
          onClick={() => setIsStarred(!isStarred)}
          className="shrink-0 p-0.5 hover:scale-110 transition-transform"
        >
          <Star className={`w-4 h-4 ${isStarred ? 'fill-[#ff9900] text-[#ff9900]' : 'text-gray-400'}`} />
        </button>
        
        <div className="flex flex-col gap-1 items-center shrink-0">
          <div className="border-2 border-black p-1.5 bg-[#f5f0e8] flex items-center justify-center shrink-0 w-8 h-8">
            {getIcon(item.type)}
          </div>
          <span className="border-2 border-black text-[8px] font-black text-white bg-red-600 px-1 leading-none">
            A ▲
          </span>
        </div>
      </div>

      {/* Sección Central (Información) */}
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        {/* Fila 1 (Título y Tags) */}
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-black text-base uppercase tracking-tight truncate max-w-[200px] sm:max-w-none">
            {displayTitle}
          </h3>
          <span className="border border-black px-1.5 py-0.5 text-[9px] font-bold uppercase bg-[#f5f0e8] shrink-0">
            {item.type}
          </span>
        </div>

        {/* Fila 2 (Descripción) */}
        <p className="truncate text-xs text-gray-600 uppercase font-bold">
          {item.description || 'SIN DETALLES ADICIONALES.'}
        </p>

        {/* Fila 3 (Metadatos) */}
        <div className="flex items-center gap-3 text-[10px] text-gray-500 font-bold flex-wrap">
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {dateFormatted}
          </span>
          <span className="flex items-center gap-1">
            <CheckSquare className="w-3.5 h-3.5" />
            0/1
          </span>
        </div>
      </div>

      {/* Sección Derecha (Acciones) */}
      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
        <select 
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="border-2 border-black px-2 py-1 text-[10px] font-black uppercase bg-white focus:outline-none cursor-pointer"
        >
          <option value="PENDIENTE">PENDIENTE</option>
          <option value="PROCESO">PROCESO</option>
          <option value="HECHO">HECHO</option>
        </select>

        <div className="flex gap-1.5">
          <button 
            onClick={() => toast.success(`Editar registro: ${displayTitle}`)}
            className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-[30px] h-[30px] shrink-0"
            title="Editar"
          >
            <Edit2 className="w-4 h-4 text-black" />
          </button>
          <button 
            onClick={() => toast.info(`Carga rápida para: ${displayTitle}`)}
            className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-[30px] h-[30px] shrink-0"
            title="Subir archivo"
          >
            <Upload className="w-4 h-4 text-black" />
          </button>
          <button 
            onClick={handleShare}
            className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-[30px] h-[30px] shrink-0"
            title="Compartir"
          >
            <Share2 className="w-4 h-4 text-black" />
          </button>
          <button 
            onClick={handleCopy}
            className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-[30px] h-[30px] shrink-0"
            title="Copiar"
          >
            <Copy className="w-4 h-4 text-black" />
          </button>
          <button 
            onClick={() => toast.error('Eliminar no permitido desde el historial')}
            className="border-2 border-black p-1.5 bg-white hover:bg-gray-100 transition-colors flex items-center justify-center w-[30px] h-[30px] shrink-0"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4 text-black" />
          </button>
        </div>
      </div>
    </div>
  );
};

export const Timeline: React.FC<TimelineProps> = ({ items, locationName }) => {
  if (!items || items.length === 0) {
    return <p className="text-center p-4 text-xs italic text-slate-400">Sin historial registrado para esta ubicación.</p>;
  }

  return (
    <div className="w-full space-y-4">
      {items.map((item) => (
        <TimelineRow key={item.id} item={item} locationName={locationName} />
      ))}
    </div>
  );
};
