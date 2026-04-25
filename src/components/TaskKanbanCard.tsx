import { memo } from 'react';
import { Edit2, Trash2, CheckSquare, Paperclip, Share2 } from 'lucide-react';

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  path: string;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  priority: 'alta' | 'media' | 'baja';
  status: 'pendiente' | 'en_proceso' | 'completado';
  createdAt: string;
  authorId: string;
  dueDate?: string;
  attachments?: any[];
  tags?: string[];
  subtasks?: Subtask[];
  recurrence?: 'none' | 'diaria' | 'semanal' | 'mensual';
  comments?: any[];
}

interface TaskKanbanCardProps {
  task: any;
  isAdmin: boolean;
  onEdit: (task: any) => void;
  onDelete: (id: string) => void;
  onShare: (task: any) => void;
  isPinned?: boolean;
  onTogglePin?: (id: string) => void;
  onDuplicate?: (task: any) => void;
}

const priorityColorMap: Record<string, string> = {
  alta: 'bg-[#e63b2e] text-white',
  media: 'bg-[#0055ff] text-white',
  baja: 'bg-[#00cc66] text-white',
};

function getPriorityColor(priority: string): string {
  return priorityColorMap[priority] || 'bg-gray-200 text-black';
}

export const TaskKanbanCard = memo(function TaskKanbanCard({ task, isAdmin, onEdit, onDelete, onShare, isPinned, onTogglePin, onDuplicate }: TaskKanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('taskId', task.id);
        setTimeout(() => {
          (e.target as HTMLElement).classList.add('opacity-50');
        }, 0);
      }}
      onDragEnd={(e) => {
        (e.target as HTMLElement).classList.remove('opacity-50');
      }}
      onClick={() => onEdit(task)}
      className={`p-2.5 sm:p-3 bg-white border-2 border-[#1a1a1a] cursor-pointer hover:-translate-y-0.5 transition-all group ${isPinned ? 'shadow-[4px_4px_0px_0px_rgba(255,153,0,1)]' : 'shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)]'}`}
    >
      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
        <span
          className={`px-1.5 sm:px-2 py-0.5 border-2 border-[#1a1a1a] font-black uppercase text-[10px] sm:text-xs tracking-wider ${getPriorityColor(task.priority)}`}
        >
          {task.priority}
        </span>
        <div className="flex gap-0.5 sm:gap-1 align-center">
          {onTogglePin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onTogglePin(task.id);
              }}
              className={`min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center p-1 transition-colors rounded ${isPinned ? 'text-[#ff9900]' : 'text-gray-400 hover:text-[#1a1a1a]'}`}
              title="Favorito"
            >
               <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onShare(task);
            }}
            className="min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center p-1 hover:bg-[#00cc66] hover:text-white transition-colors rounded"
            title="Compartir"
          >
            <Share2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(task);
            }}
            className="min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors rounded"
            title="Editar"
          >
            <Edit2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
          </button>
          {onDuplicate && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDuplicate(task);
              }}
              className="min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors rounded"
              title="Duplicar"
            >
              <svg className="w-3.5 h-3.5 sm:w-3 sm:h-3" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="square" strokeLinejoin="miter" d="M8 7h12v14H8z"></path><path strokeLinecap="square" strokeLinejoin="miter" d="M16 7V3H4v14h4"></path></svg>
            </button>
          )}
          {isAdmin && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(task.id);
              }}
              className="min-w-[32px] min-h-[32px] sm:min-w-[28px] sm:min-h-[28px] flex items-center justify-center p-1 hover:bg-[#e63b2e] hover:text-white transition-colors rounded"
              title="Eliminar"
            >
              <Trash2 className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
            </button>
          )}
        </div>
      </div>
      <h4
        className={`font-black uppercase tracking-tight mb-1.5 sm:mb-2 text-xs sm:text-sm ${task.status === 'completado' ? 'line-through text-gray-500' : ''}`}
      >
        {task.title}
      </h4>
      {task.tags && task.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5 sm:mb-2">
          {task.tags.map((tag: string) => (
            <span
              key={tag}
              className="px-1 sm:px-1.5 py-0.5 bg-[#f5f0e8] border border-[#1a1a1a] text-[10px] sm:text-[10px] font-bold uppercase tracking-wider"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {task.dueDate && (
        <p className="text-[10px] sm:text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">
          Vence: {task.dueDate}
        </p>
      )}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] sm:text-[10px] font-bold opacity-60 uppercase tracking-wider mb-1.5 sm:mb-2">
          <CheckSquare className="w-3 h-3 sm:w-3 sm:h-3" /> {task.subtasks.filter((st: any) => st.completed).length}/
          {task.subtasks.length}
        </div>
      )}
      {task.attachments && task.attachments.length > 0 && (
        <div className="flex items-center gap-1 text-[10px] sm:text-[10px] font-bold opacity-60 uppercase tracking-wider">
          <Paperclip className="w-3 h-3 sm:w-3 sm:h-3" /> {task.attachments.length}
        </div>
      )}
    </div>
  );
});
