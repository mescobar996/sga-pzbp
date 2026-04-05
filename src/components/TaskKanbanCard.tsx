import { memo } from 'react';
import { Edit2, Trash2, CheckSquare, Paperclip } from 'lucide-react';

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
}

const priorityColorMap: Record<string, string> = {
  alta: 'bg-[#e63b2e] text-white',
  media: 'bg-[#0055ff] text-white',
  baja: 'bg-[#00cc66] text-white',
};

function getPriorityColor(priority: string): string {
  return priorityColorMap[priority] || 'bg-gray-200 text-black';
}

export const TaskKanbanCard = memo(function TaskKanbanCard({ task, isAdmin, onEdit, onDelete }: TaskKanbanCardProps) {
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
      className="p-2.5 sm:p-3 bg-white border-2 border-[#1a1a1a] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] cursor-move hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] transition-all group"
    >
      <div className="flex justify-between items-start mb-1.5 sm:mb-2">
        <span
          className={`px-1.5 sm:px-2 py-0.5 border-2 border-[#1a1a1a] font-black uppercase text-[8px] sm:text-[9px] tracking-widest ${getPriorityColor(task.priority)}`}
        >
          {task.priority}
        </span>
        <div className="flex gap-0.5 sm:gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(task)}
            className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors"
            title="Editar"
          >
            <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          </button>
          {isAdmin && (
            <button
              onClick={() => onDelete(task.id)}
              className="p-1 hover:bg-[#e63b2e] hover:text-white transition-colors"
              title="Eliminar"
            >
              <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
              className="px-1 sm:px-1.5 py-0.5 bg-[#f5f0e8] border border-[#1a1a1a] text-[8px] sm:text-[9px] font-bold uppercase tracking-widest"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
      {task.dueDate && (
        <p className="text-[8px] sm:text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1.5 sm:mb-2">
          Vence: {task.dueDate}
        </p>
      )}
      {task.subtasks && task.subtasks.length > 0 && (
        <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold opacity-60 uppercase tracking-widest mb-1.5 sm:mb-2">
          <CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {task.subtasks.filter((st: any) => st.completed).length}/
          {task.subtasks.length}
        </div>
      )}
      {task.attachments && task.attachments.length > 0 && (
        <div className="flex items-center gap-1 text-[8px] sm:text-[10px] font-bold opacity-60 uppercase tracking-widest">
          <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {task.attachments.length}
        </div>
      )}
    </div>
  );
});
