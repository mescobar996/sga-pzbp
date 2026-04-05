import React, { useState, useEffect, memo, useCallback, useMemo } from 'react';
import {
  Plus,
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Search,
  Edit2,
  LayoutGrid,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Upload,
  Paperclip,
  X,
  Columns,
  History,
  CheckSquare,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'sonner';
import { useOutletContext } from 'react-router-dom';
import { taskSchema } from '../utils/validation';
import { TaskKanbanCard } from '../components/TaskKanbanCard';
import type { TaskHistory, Task } from '../types';
import { getTasks, addTask, updateTask, deleteTask, onTasksChange, logTaskHistory } from '../db/tasks';
import { onTaskHistoryChange } from '../db/taskHistory';
import { addNotification } from '../db/notifications';
import { supabase, getCurrentUserId } from '../db/client';

function handleError(error: unknown) {
  console.error('Error:', error);
  toast.error('Error al procesar la solicitud');
}

interface Attachment {
  name: string;
  url: string;
  type: string;
  path: string;
}

interface TaskHistoryEvent {
  id: string;
  taskId: string;
  taskTitle: string;
  action: 'completado' | 'eliminado';
  timestamp: string;
  userId: string;
  userEmail: string;
}

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

interface LocalAttachment {
  name: string;
  url: string;
  type: string;
  path: string;
  size?: number;
}

interface TaskComment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export default function Tareas() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'pendiente' | 'en_proceso' | 'completado'>('todos');
  const [priorityFilter, setPriorityFilter] = useState<'todos' | 'alta' | 'media' | 'baja'>('todos');
  const [tagFilter, setTagFilter] = useState<string>('todos');
  const [viewMode, setViewMode] = useState<'grid' | 'calendar' | 'kanban' | 'history'>('kanban');
  const [historyEvents, setHistoryEvents] = useState<TaskHistoryEvent[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Pagination State
  const [currentPageGrid, setCurrentPageGrid] = useState(1);
  const itemsPerPageGrid = 6;
  const [currentPageHistory, setCurrentPageHistory] = useState(1);
  const itemsPerPageHistory = 10;

  // Server-side pagination cursors
  const [tasksLastDoc, setTasksLastDoc] = useState<any>(null);
  const [hasMoreTasks, setHasMoreTasks] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const tasksPageSize = 50;

  // Unified Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTask, setCurrentTask] = useState<Partial<Task>>({
    title: '',
    description: '',
    priority: 'media',
    status: 'pendiente',
    dueDate: '',
    attachments: [],
    tags: [],
    subtasks: [],
    recurrence: 'none',
  });
  const [currentTagsInput, setCurrentTagsInput] = useState<string>('');
  const [newSubtaskTitle, setNewSubtaskTitle] = useState<string>('');
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [attachmentsToDelete, setAttachmentsToDelete] = useState<Attachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'description' | 'subtasks' | 'attachments'>('description');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const safetyTimeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    const unsub = onTasksChange((data) => {
      clearTimeout(safetyTimeout);
      setTasks(data as any);
      setLoading(false);
    });
    return () => {
      clearTimeout(safetyTimeout);
      unsub();
    };
  }, []);

  const loadMoreTasks = async () => {
    // Pagination with Supabase: use range-based pagination
    if (!hasMoreTasks || isLoadingMore) return;
    setIsLoadingMore(true);
    try {
      const start = tasks.length;
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false })
        .range(start, start + tasksPageSize - 1);
      if (error) throw error;
      const newTasks = (data || []).map(mapRowToTask);
      setTasks((prev) => [...prev, ...newTasks]);
      setHasMoreTasks((data || []).length === tasksPageSize);
    } catch (error) {
      handleError(error);
    } finally {
      setIsLoadingMore(false);
    }
  };

  function mapRowToTask(row: Record<string, any>): Task {
    return {
      id: row.id,
      title: row.title,
      description: row.description,
      priority: row.priority || 'media',
      status: row.status || 'pendiente',
      createdAt: row.created_at || '',
      authorId: row.author_id || '',
      dueDate: row.due_date || '',
      assignedTo: row.assigned_to || '',
      attachments: (row.attachments || []) as any,
      tags: row.tags || [],
      subtasks: (row.subtasks || []) as any,
      recurrence: row.recurrence || 'none',
      comments: (row.comments || []) as any,
    } as Task;
  }

  useEffect(() => {
    const unsub = onTaskHistoryChange((data) => {
      setHistoryEvents(data);
    });
    return unsub;
  }, []);

  const logTaskHistoryFn = async (taskId: string, taskTitle: string, action: 'completado' | 'eliminado') => {
    await logTaskHistory(taskId, taskTitle, action);
  };

  const openNewTaskModal = (initialDate?: string) => {
    setCurrentTask({
      title: '',
      description: '',
      priority: 'media',
      status: 'pendiente',
      dueDate: initialDate || '',
      attachments: [],
      tags: [],
      subtasks: [],
      recurrence: 'none',
    });
    setCurrentTagsInput('');
    setNewSubtaskTitle('');
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setFormErrors({});
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const openEditTaskModal = (task: Task) => {
    setCurrentTask({
      ...task,
      attachments: task.attachments || [],
      tags: task.tags || [],
      subtasks: task.subtasks || [],
      recurrence: task.recurrence || 'none',
    });
    setCurrentTagsInput((task.tags || []).join(', '));
    setNewSubtaskTitle('');
    setPendingFiles([]);
    setAttachmentsToDelete([]);
    setFormErrors({});
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSaveTask = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    const validationResult = taskSchema.safeParse({
      title: currentTask.title,
      description: currentTask.description,
      priority: currentTask.priority,
      status: currentTask.status,
      dueDate: currentTask.dueDate,
      assignedTo: '',
      tags: currentTagsInput
        .split(',')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
      recurrence: currentTask.recurrence,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const field = issue.path[0] as string;
        if (!errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFormErrors(errors);
      toast.error('Por favor corrige los errores del formulario');
      return;
    }

    setFormErrors({});

    try {
      setIsUploading(true);
      let taskId = currentTask.id;

      if (!isEditing || !taskId) {
        taskId = await addTask({
          title: validationResult.data.title,
          description: validationResult.data.description || '',
          priority: validationResult.data.priority,
          status: validationResult.data.status,
          dueDate: validationResult.data.dueDate || '',
          attachments: [],
          tags: [],
          subtasks: currentTask.subtasks || [],
          recurrence: validationResult.data.recurrence || 'none',
          comments: [],
          authorId: getCurrentUserId(),
          createdAt: new Date().toISOString(),
        } as any);

        if (validationResult.data.priority === 'alta') {
          await addNotification({
            title: 'Nueva Tarea Urgente',
            message: validationResult.data.title,
            type: 'tarea',
          });
        }
      }

      // Upload pending files
      const newAttachments: Attachment[] = [];
      for (const file of pendingFiles) {
        const filePath = `tasks/${taskId}/${Date.now()}_${file.name}`;
        const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);
        newAttachments.push({
          name: file.name,
          url: data.publicUrl,
          type: file.type,
          path: filePath,
        });
      }

      // Delete removed attachments
      for (const att of attachmentsToDelete) {
        try {
          const path = att.path || att.url.split('/object/public/attachments/')[1] || '';
          if (path) await supabase.storage.from('attachments').remove([path]);
        } catch (e) {
          console.error('Error deleting file', e);
        }
      }

      const finalAttachments = [
        ...(currentTask.attachments || []).filter((a: any) => !attachmentsToDelete.includes(a as any)),
        ...newAttachments,
      ];
      const finalTags = validationResult.data.tags || [];

      if (isEditing && taskId) {
        const originalTask = tasks.find((t) => t.id === taskId);
        if (validationResult.data.status === 'completado' && originalTask?.status !== 'completado') {
          await logTaskHistoryFn(taskId, currentTask.title || '', 'completado');
        }
      } else if (validationResult.data.status === 'completado' && taskId) {
        await logTaskHistoryFn(taskId, currentTask.title || '', 'completado');
      }

      await updateTask(taskId, {
        title: validationResult.data.title,
        description: validationResult.data.description || '',
        priority: validationResult.data.priority,
        status: validationResult.data.status,
        dueDate: validationResult.data.dueDate || '',
        attachments: finalAttachments as any,
        tags: finalTags,
        subtasks: currentTask.subtasks || [],
        recurrence: validationResult.data.recurrence || 'none',
      });

      setIsModalOpen(false);
      setIsUploading(false);
      toast.success(isEditing ? 'Tarea actualizada' : 'Tarea creada');
    } catch (error) {
      setIsUploading(false);
      handleError(error);
    }
  };

  const handleUpdatePriority = async (taskId: string, newPriority: 'alta' | 'media' | 'baja') => {
    try {
      await updateTask(taskId, { priority: newPriority });
    } catch (error) {
      handleError(error);
    }
  };

  const handleUpdateDueDate = async (taskId: string, newDueDate: string) => {
    try {
      await updateTask(taskId, { dueDate: newDueDate });
    } catch (error) {
      handleError(error);
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: 'pendiente' | 'en_proceso' | 'completado') => {
    try {
      const taskToUpdate = tasks.find((t) => t.id === taskId);
      if (!taskToUpdate) return;
      if (newStatus === 'completado' && taskToUpdate.status !== 'completado') {
        await logTaskHistoryFn(taskId, taskToUpdate.title, 'completado');

        if (taskToUpdate.recurrence && taskToUpdate.recurrence !== 'none') {
          let nextDueDate = new Date();
          if (taskToUpdate.dueDate) {
            nextDueDate = new Date(taskToUpdate.dueDate);
          }

          if (taskToUpdate.recurrence === 'diaria') {
            nextDueDate.setDate(nextDueDate.getDate() + 1);
          } else if (taskToUpdate.recurrence === 'semanal') {
            nextDueDate.setDate(nextDueDate.getDate() + 7);
          } else if (taskToUpdate.recurrence === 'mensual') {
            nextDueDate.setMonth(nextDueDate.getMonth() + 1);
          }

          await addTask({
            title: taskToUpdate.title,
            description: taskToUpdate.description || '',
            priority: taskToUpdate.priority || 'media',
            status: 'pendiente',
            dueDate: nextDueDate.toISOString().split('T')[0],
            authorId: getCurrentUserId(),
            createdAt: new Date().toISOString(),
            attachments: (taskToUpdate.attachments || []) as any,
            tags: taskToUpdate.tags || [],
            subtasks: (taskToUpdate.subtasks || []).map((st) => ({ ...st, completed: false })),
            recurrence: taskToUpdate.recurrence,
            comments: [],
          } as any);
        }
      }
      await updateTask(taskId, { status: newStatus });
    } catch (error) {
      handleError(error);
    }
  };

  const handleQuickUpload = async (taskId: string, currentAttachments: Attachment[] = [], file: File) => {
    try {
      toast.loading(`Subiendo ${file.name}...`, { id: `upload-${taskId}` });

      const filePath = `tasks/${taskId}/${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('attachments').getPublicUrl(filePath);

      const newAttachment: Attachment = {
        name: file.name,
        url: data.publicUrl,
        type: file.type,
        path: filePath,
      };

      await updateTask(taskId, {
        attachments: [...currentAttachments, newAttachment] as any,
      });

      toast.success(`Archivo ${file.name} subido correctamente`, { id: `upload-${taskId}` });
    } catch (error) {
      console.error('Error quick uploading file:', error);
      toast.error('Error al subir el archivo.', { id: `upload-${taskId}` });
    }
  };

  const handleDeleteTask = async (id: string) => {
    try {
      const taskToDelete = tasks.find((t) => t.id === id);
      if (taskToDelete) {
        await logTaskHistoryFn(id, taskToDelete.title, 'eliminado');
      }
      await deleteTask(id);
    } catch (error) {
      handleError(error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'alta':
        return 'bg-[#e63b2e] text-white';
      case 'media':
        return 'bg-[#0055ff] text-white';
      case 'baja':
        return 'bg-[#00cc66] text-white';
      default:
        return 'bg-gray-200 text-black';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completado':
        return <CheckCircle className="w-6 h-6 text-[#00cc66]" />;
      case 'en_proceso':
        return <Clock className="w-6 h-6 text-[#0055ff]" />;
      default:
        return <AlertCircle className="w-6 h-6 text-[#e63b2e]" />;
    }
  };

  const filteredTasks = useMemo(
    () =>
      tasks.filter((task) => {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(query) ||
          (task.description && task.description.toLowerCase().includes(query));
        const matchesStatus = statusFilter === 'todos' || task.status === statusFilter;
        const matchesPriority = priorityFilter === 'todos' || task.priority === priorityFilter;
        const matchesTag = tagFilter === 'todos' || (task.tags && task.tags.includes(tagFilter));

        return matchesSearch && matchesStatus && matchesPriority && matchesTag;
      }),
    [tasks, searchQuery, statusFilter, priorityFilter, tagFilter],
  );

  // Reset page when filters change
  useEffect(() => {
    setCurrentPageGrid(1);
  }, [searchQuery, statusFilter, priorityFilter, tagFilter]);

  const totalPagesGrid = Math.max(1, Math.ceil(filteredTasks.length / itemsPerPageGrid));
  const paginatedGridTasks = filteredTasks.slice(
    (currentPageGrid - 1) * itemsPerPageGrid,
    currentPageGrid * itemsPerPageGrid,
  );

  const totalPagesHistory = Math.max(1, Math.ceil(historyEvents.length / itemsPerPageHistory));
  const paginatedHistory = historyEvents.slice(
    (currentPageHistory - 1) * itemsPerPageHistory,
    currentPageHistory * itemsPerPageHistory,
  );

  const allTags = useMemo(() => Array.from(new Set(tasks.flatMap((t) => t.tags || []))).sort(), [tasks]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthNames = [
    'Enero',
    'Febrero',
    'Marzo',
    'Abril',
    'Mayo',
    'Junio',
    'Julio',
    'Agosto',
    'Septiembre',
    'Octubre',
    'Noviembre',
    'Diciembre',
  ];

  const prevMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  const goToToday = () => setCurrentDate(new Date());

  useEffect(() => {
    if (viewMode !== 'calendar') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        prevMonth();
      } else if (e.key === 'ArrowRight') {
        nextMonth();
      } else if (e.key.toLowerCase() === 't') {
        goToToday();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewMode]);

  const getTasksForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return filteredTasks.filter((t) => t.dueDate === dateStr);
  };

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
          Lista de Tareas
        </h1>
        <div className="flex border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] bg-white">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 font-bold uppercase transition-colors text-[10px] sm:text-xs ${viewMode === 'grid' ? 'bg-[#1a1a1a] text-white' : 'hover:bg-gray-100'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Grid</span>
          </button>
          <div className="w-0.5 bg-[#1a1a1a]"></div>
          <button
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 font-bold uppercase transition-colors text-[10px] sm:text-xs ${viewMode === 'kanban' ? 'bg-[#1a1a1a] text-white' : 'hover:bg-gray-100'}`}
          >
            <Columns className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Kanban</span>
          </button>
          <div className="w-0.5 bg-[#1a1a1a]"></div>
          <button
            onClick={() => setViewMode('calendar')}
            className={`p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 font-bold uppercase transition-colors text-[10px] sm:text-xs ${viewMode === 'calendar' ? 'bg-[#1a1a1a] text-white' : 'hover:bg-gray-100'}`}
          >
            <CalendarIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Calendario</span>
          </button>
          <div className="w-0.5 bg-[#1a1a1a]"></div>
          <button
            onClick={() => setViewMode('history')}
            className={`p-1.5 sm:p-2 flex items-center gap-1.5 sm:gap-2 font-bold uppercase transition-colors text-[10px] sm:text-xs ${viewMode === 'history' ? 'bg-[#1a1a1a] text-white' : 'hover:bg-gray-100'}`}
          >
            <History className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Historial</span>
          </button>
        </div>
      </div>

      {/* Add Task Button */}
      <div className="mb-4 sm:mb-8">
        <button
          onClick={() => openNewTaskModal()}
          className="w-full sm:w-auto px-4 sm:px-6 py-2.5 sm:py-3 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors flex items-center justify-center gap-2 shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none text-xs sm:text-sm"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" /> Añadir Nueva Tarea
        </button>
      </div>

      {/* Search and Filters */}
      <div className="mb-4 sm:mb-6 flex flex-col lg:flex-row gap-3 sm:gap-4">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-[#1a1a1a] opacity-50" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="BUSCAR TAREAS..."
            className="w-full pl-9 sm:pl-10 p-2.5 sm:p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] text-[10px] sm:text-sm"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="p-2 sm:p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] cursor-pointer text-[10px] sm:text-sm"
          >
            <option value="todos">Todos los estados</option>
            <option value="pendiente">Pendiente</option>
            <option value="en_proceso">En Proceso</option>
            <option value="completado">Completado</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="p-2 sm:p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] cursor-pointer text-[10px] sm:text-sm"
          >
            <option value="todos">Todas las prioridades</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>

          <select
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="p-2 sm:p-3 border-2 border-[#1a1a1a] bg-white focus:bg-[#f5f0e8] focus:outline-none focus:ring-0 font-bold uppercase transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] cursor-pointer text-[10px] sm:text-sm"
          >
            <option value="todos">Todas las etiquetas</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List / Calendar View */}
      {viewMode === 'kanban' ? (
        <div className="flex flex-col md:flex-row gap-3 sm:gap-4 overflow-x-auto pb-4 min-h-[400px] sm:min-h-[600px]">
          {(['pendiente', 'en_proceso', 'completado'] as const).map((status) => (
            <div
              key={status}
              className="flex-1 min-w-[240px] sm:min-w-[280px] bg-gray-50 border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('bg-[#f5f0e8]');
              }}
              onDragLeave={(e) => {
                e.currentTarget.classList.remove('bg-[#f5f0e8]');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('bg-[#f5f0e8]');
                const taskId = e.dataTransfer.getData('taskId');
                if (taskId) {
                  handleUpdateStatus(taskId, status);
                }
              }}
            >
              <div className="p-2 sm:p-3 border-b-2 border-[#1a1a1a] bg-white flex justify-between items-center">
                <h3 className="font-black uppercase tracking-widest flex items-center gap-1.5 sm:gap-2 text-[10px] sm:text-sm">
                  {getStatusIcon(status)}
                  <span className="hidden sm:inline">{status.replace('_', ' ')}</span>
                  <span className="sm:hidden">
                    {status === 'en_proceso' ? 'Proceso' : status === 'completado' ? 'Listas' : 'Pendientes'}
                  </span>
                </h3>
                <span className="bg-[#1a1a1a] text-white text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 rounded-full">
                  {filteredTasks.filter((t) => t.status === status).length}
                </span>
              </div>
              <div className="p-2 sm:p-3 flex-1 flex flex-col gap-2 sm:gap-3 overflow-y-auto custom-scrollbar">
                {filteredTasks
                  .filter((t) => t.status === status)
                  .map((task) => (
                    <TaskKanbanCard
                      key={task.id}
                      task={task as Task}
                      isAdmin={isAdmin}
                      onEdit={openEditTaskModal}
                      onDelete={handleDeleteTask}
                    />
                  ))}
                {filteredTasks.filter((t) => t.status === status).length === 0 && (
                  <div className="text-center p-6 sm:p-8 border-2 border-dashed border-gray-300 text-gray-400 font-bold uppercase text-[10px] sm:text-sm">
                    Arrastra tareas aquí
                  </div>
                )}
              </div>
            </div>
          ))}
          {hasMoreTasks && (
            <div className="flex justify-center mt-4 w-full">
              <button
                onClick={loadMoreTasks}
                disabled={isLoadingMore}
                className="px-5 py-2 border-2 border-[#1a1a1a] bg-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed text-sm flex items-center gap-2"
              >
                {isLoadingMore ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                    Cargando más...
                  </>
                ) : (
                  'Cargar más tareas'
                )}
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'history' ? (
        <div className="bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-5">
          <h2 className="text-2xl font-black uppercase mb-4 font-['Space_Grotesk'] tracking-widest border-b-2 border-[#1a1a1a] pb-3">
            Historial de Tareas
          </h2>
          <div className="flex flex-col gap-3">
            {paginatedHistory.length === 0 ? (
              <div className="text-center p-8 font-black uppercase text-lg opacity-50">
                No hay eventos en el historial
              </div>
            ) : (
              paginatedHistory.map((event) => (
                <div
                  key={event.id}
                  className="p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] flex flex-col md:flex-row justify-between items-start md:items-center gap-3 hover:bg-[#1a1a1a] hover:text-white transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`p-2 border-2 border-[#1a1a1a] group-hover:border-white ${event.action === 'completado' ? 'bg-[#00cc66] text-white' : 'bg-[#e63b2e] text-white'}`}
                    >
                      {event.action === 'completado' ? (
                        <CheckCircle className="w-5 h-5" />
                      ) : (
                        <Trash2 className="w-5 h-5" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black uppercase tracking-widest text-base">{event.taskTitle}</h4>
                      <p className="text-xs font-bold opacity-70 uppercase tracking-widest">
                        {event.action === 'completado' ? 'Completada' : 'Eliminada'} por {event.userEmail}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold uppercase tracking-widest opacity-70">
                      {new Date(event.timestamp).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] font-bold uppercase tracking-widest opacity-50">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* History Pagination */}
          {totalPagesHistory > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                onClick={() => setCurrentPageHistory((p) => Math.max(1, p - 1))}
                disabled={currentPageHistory === 1}
                className="p-1.5 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-black uppercase tracking-widest text-sm">
                Página {currentPageHistory} de {totalPagesHistory}
              </span>
              <button
                onClick={() => setCurrentPageHistory((p) => Math.min(totalPagesHistory, p + 1))}
                disabled={currentPageHistory === totalPagesHistory}
                className="p-1.5 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="flex flex-col gap-3 sm:gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {loading ? (
              <div className="col-span-full text-center p-6 sm:p-8 font-black uppercase text-base sm:text-xl animate-pulse">
                Cargando tareas...
              </div>
            ) : tasks.length === 0 ? (
              <div className="col-span-full text-center p-6 sm:p-8 bg-white border-2 border-[#1a1a1a] font-black uppercase text-base sm:text-xl opacity-50">
                No hay tareas pendientes
              </div>
            ) : paginatedGridTasks.length === 0 ? (
              <div className="col-span-full text-center p-6 sm:p-8 bg-white border-2 border-[#1a1a1a] font-black uppercase text-base sm:text-xl opacity-50">
                No se encontraron tareas para "{searchQuery}"
              </div>
            ) : (
              <AnimatePresence mode="popLayout">
                {paginatedGridTasks.map((task) => (
                  <motion.div
                    key={task.id}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                      opacity: task.status === 'completado' ? 0.7 : 1,
                      scale: 1,
                      backgroundColor: task.status === 'completado' ? '#e5e7eb' : '#ffffff',
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    whileHover={task.status !== 'completado' ? { y: -4 } : {}}
                    transition={{ duration: 0.3 }}
                    className="p-3 sm:p-4 border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] flex flex-col justify-between group relative"
                  >
                    <div className="flex justify-between items-start mb-2 sm:mb-4 gap-2">
                      <select
                        value={task.priority}
                        onChange={(e) => handleUpdatePriority(task.id, e.target.value as 'alta' | 'media' | 'baja')}
                        className={`px-1.5 sm:px-2 py-0.5 border-2 border-[#1a1a1a] font-black uppercase text-[8px] sm:text-[10px] tracking-widest cursor-pointer focus:outline-none ${getPriorityColor(task.priority)}`}
                      >
                        <option value="alta" className="bg-[#e63b2e] text-white">
                          ALTA
                        </option>
                        <option value="media" className="bg-[#0055ff] text-white">
                          MEDIA
                        </option>
                        <option value="baja" className="bg-[#00cc66] text-white">
                          BAJA
                        </option>
                      </select>

                      <div className="flex items-center gap-1">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            handleUpdateStatus(task.id, e.target.value as 'pendiente' | 'en_proceso' | 'completado')
                          }
                          className="px-1.5 sm:px-2 py-0.5 border-2 border-[#1a1a1a] font-black uppercase text-[8px] sm:text-[10px] tracking-widest cursor-pointer focus:outline-none bg-white text-[#1a1a1a]"
                        >
                          <option value="pendiente">PENDIENTE</option>
                          <option value="en_proceso">EN PROCESO</option>
                          <option value="completado">COMPLETADO</option>
                        </select>
                        <div className="p-0.5 sm:p-1 border-2 border-[#1a1a1a] bg-[#f5f0e8]">
                          {getStatusIcon(task.status)}
                        </div>
                      </div>
                    </div>

                    <div className="mb-2 sm:mb-4 flex-1 flex flex-col">
                      <h3
                        className={`text-base sm:text-xl font-black uppercase tracking-tight font-['Space_Grotesk'] line-clamp-2 relative w-fit ${task.status === 'completado' ? 'text-gray-500' : ''}`}
                        title={task.title}
                      >
                        {task.title}
                        {task.status === 'completado' && (
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            className="absolute top-1/2 left-0 h-1 bg-gray-500 -translate-y-1/2"
                          />
                        )}
                      </h3>

                      {task.tags && task.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5 sm:mt-2">
                          {task.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1 sm:px-1.5 py-0.5 bg-[#f5f0e8] border border-[#1a1a1a] text-[8px] sm:text-[9px] font-bold uppercase tracking-widest"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}

                      <button
                        onClick={() => openEditTaskModal(task)}
                        className={`mt-2 sm:mt-3 mb-2 sm:mb-3 p-1.5 sm:p-2 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors text-left flex justify-between items-center group flex-1 ${task.status === 'completado' ? 'bg-gray-300' : 'bg-[#f5f0e8]'}`}
                      >
                        <div className="flex-1 overflow-hidden relative">
                          {task.description ? (
                            <p
                              className={`text-[10px] sm:text-xs font-medium line-clamp-2 relative w-fit ${task.status === 'completado' ? 'text-gray-600' : ''}`}
                            >
                              {task.description}
                              {task.status === 'completado' && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
                                  className="absolute top-1/2 left-0 h-[2px] bg-gray-600 -translate-y-1/2"
                                />
                              )}
                            </p>
                          ) : (
                            <span
                              className={`text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-50 relative w-fit ${task.status === 'completado' ? 'text-gray-600' : ''}`}
                            >
                              Añadir Descripción...
                              {task.status === 'completado' && (
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: '100%' }}
                                  transition={{ duration: 0.3, ease: 'easeOut', delay: 0.1 }}
                                  className="absolute top-1/2 left-0 h-[2px] bg-gray-600 -translate-y-1/2"
                                />
                              )}
                            </span>
                          )}
                        </div>
                        <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1 sm:ml-2 opacity-50 group-hover:opacity-100 flex-shrink-0" />
                      </button>

                      <div className="mb-2 sm:mb-3">
                        <label className="block text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60 mb-1">
                          Vencimiento:
                        </label>
                        <input
                          type="date"
                          value={task.dueDate || ''}
                          onChange={(e) => handleUpdateDueDate(task.id, e.target.value)}
                          className="w-full p-1 sm:p-1.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-[10px] sm:text-xs cursor-pointer"
                        />
                      </div>

                      <p className="text-[8px] sm:text-[10px] font-bold opacity-60 uppercase tracking-widest mt-auto">
                        Creada: {new Date(task.createdAt).toLocaleDateString()}
                      </p>
                      {task.subtasks && task.subtasks.length > 0 && (
                        <div
                          className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[8px] sm:text-xs font-bold opacity-60 uppercase tracking-widest"
                          title={`${task.subtasks.length} subtareas`}
                        >
                          <CheckSquare className="w-2.5 h-2.5 sm:w-3 sm:h-3" />{' '}
                          {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}
                        </div>
                      )}
                      {task.attachments && task.attachments.length > 0 && (
                        <div
                          className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[8px] sm:text-xs font-bold opacity-60 uppercase tracking-widest"
                          title={`${task.attachments.length} archivos adjuntos`}
                        >
                          <Paperclip className="w-2.5 h-2.5 sm:w-3 sm:h-3" /> {task.attachments.length}
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end gap-1.5 sm:gap-2 mt-auto pt-2 sm:pt-3 border-t-2 border-[#1a1a1a]/10">
                      <label
                        className="p-1 sm:p-1.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] hover:bg-[#1a1a1a] hover:text-white transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
                        title="Subir archivo rápido"
                      >
                        <Upload className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <input
                          type="file"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              handleQuickUpload(task.id, task.attachments as any, file);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                      {isAdmin && (
                        <button
                          onClick={() => handleDeleteTask(task.id)}
                          className="p-1 sm:p-1.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] hover:bg-[#e63b2e] hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                          title="Eliminar tarea"
                        >
                          <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          {/* Grid Pagination */}
          {totalPagesGrid > 1 && (
            <div className="flex justify-center items-center gap-3 mt-6">
              <button
                onClick={() => setCurrentPageGrid((p) => Math.max(1, p - 1))}
                disabled={currentPageGrid === 1}
                className="p-1.5 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="font-black uppercase tracking-widest text-sm">
                Página {currentPageGrid} de {totalPagesGrid}
              </span>
              <button
                onClick={() => setCurrentPageGrid((p) => Math.min(totalPagesGrid, p + 1))}
                disabled={currentPageGrid === totalPagesGrid}
                className="p-1.5 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white border-2 border-[#1a1a1a] shadow-[3px_3px_0px_0px_rgba(26,26,26,1)] sm:shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] p-3 sm:p-5 overflow-x-auto">
          <div className="flex flex-col sm:flex-row justify-between items-center mb-3 sm:mb-4 gap-2 sm:gap-4">
            <div className="flex gap-2 order-2 sm:order-1">
              <button
                onClick={prevMonth}
                className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                title="Mes anterior"
              >
                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={goToToday}
                className="px-3 py-1.5 border-2 border-[#1a1a1a] font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none text-xs sm:text-sm"
                title="Ir a hoy"
              >
                Hoy
              </button>
              <button
                onClick={nextMonth}
                className="p-1.5 border-2 border-[#1a1a1a] hover:bg-[#1a1a1a] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                title="Mes siguiente"
              >
                <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            <h2 className="text-lg sm:text-2xl font-black uppercase tracking-widest font-['Space_Grotesk'] text-center order-1 sm:order-2">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-1 sm:mb-2">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map((d) => (
              <div
                key={d}
                className="text-center font-black uppercase text-[8px] sm:text-sm py-1.5 sm:py-2 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a]"
              >
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
              <div
                key={`empty-${i}`}
                className="min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 bg-gray-50 border-2 border-dashed border-gray-300"
              ></div>
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dayTasks = getTasksForDay(day);
              const isToday =
                new Date().getDate() === day &&
                new Date().getMonth() === currentDate.getMonth() &&
                new Date().getFullYear() === currentDate.getFullYear();

              return (
                <div
                  key={day}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const taskId = e.dataTransfer.getData('taskId');
                    if (taskId) {
                      const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                      handleUpdateDueDate(taskId, dateStr);
                    }
                  }}
                  className={`min-h-[60px] sm:min-h-[120px] p-1 sm:p-2 border-2 border-[#1a1a1a] flex flex-col relative group ${isToday ? 'bg-[#0055ff]/20' : 'bg-[#f5f0e8]'}`}
                >
                  <div className="flex justify-between items-start mb-1 sm:mb-2">
                    <span
                      className={`font-black text-sm sm:text-lg w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center ${isToday ? 'bg-[#1a1a1a] text-white rounded-full' : ''}`}
                    >
                      {day}
                    </span>
                    <button
                      onClick={() => {
                        const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        openNewTaskModal(dateStr);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 sm:p-1 hover:bg-[#1a1a1a] hover:text-white border-2 border-transparent hover:border-[#1a1a1a] transition-all rounded-full"
                      title="Añadir tarea"
                    >
                      <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                    </button>
                  </div>
                  <div className="flex-1 flex flex-col gap-0.5 sm:gap-1 overflow-y-auto max-h-[40px] sm:max-h-[100px] custom-scrollbar">
                    {dayTasks.map((t) => {
                      const isOverdue =
                        t.dueDate &&
                        new Date(t.dueDate) < new Date(new Date().setHours(0, 0, 0, 0)) &&
                        t.status !== 'completado';
                      const isHighPriority = t.priority === 'alta' && t.status !== 'completado';

                      return (
                        <div
                          key={t.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('taskId', t.id);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditTaskModal(t);
                          }}
                          className={`text-[8px] sm:text-xs p-1 sm:p-1.5 border-2 border-[#1a1a1a] font-bold uppercase truncate cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-between gap-0.5 sm:gap-1 ${t.status === 'completado' ? 'line-through opacity-50 bg-gray-200 text-gray-600' : getPriorityColor(t.priority)} ${isOverdue ? 'ring-1 sm:ring-2 ring-red-500' : ''}`}
                          title={`${t.title}${isOverdue ? ' (Vencida)' : ''}`}
                        >
                          <span className="truncate">{t.title}</span>
                          <div className="flex items-center gap-0.5 sm:gap-1 flex-shrink-0">
                            {isHighPriority && <AlertCircle className="w-2 h-2 sm:w-3 sm:h-3 text-red-600" />}
                            {isOverdue && <Clock className="w-2 h-2 sm:w-3 sm:h-3 text-red-600" />}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Unified Task Modal (Create & Edit) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-10 pb-10">
          <div className="bg-white border-2 border-[#1a1a1a] shadow-[6px_6px_0px_0px_rgba(26,26,26,1)] p-5 w-full max-w-2xl relative">
            <h2 className="text-2xl font-black uppercase mb-4 font-['Space_Grotesk'] tracking-widest">
              {isEditing ? 'Editar Tarea' : 'Nueva Tarea'}
            </h2>

            <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Vencimiento</label>
                <input
                  type="date"
                  value={currentTask.dueDate || ''}
                  onChange={(e) => {
                    setCurrentTask({ ...currentTask, dueDate: e.target.value });
                    if (formErrors.dueDate)
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.dueDate;
                        return next;
                      });
                  }}
                  className={`w-full p-2 border-2 bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm ${formErrors.dueDate ? 'border-[#e63b2e] bg-red-50' : 'border-[#1a1a1a]'}`}
                />
                {formErrors.dueDate && (
                  <p className="text-[#e63b2e] text-xs font-bold mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> {formErrors.dueDate}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Estado</label>
                  <select
                    value={currentTask.status || 'pendiente'}
                    onChange={(e) => setCurrentTask({ ...currentTask, status: e.target.value as any })}
                    className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm"
                  >
                    <option value="pendiente">Pendiente</option>
                    <option value="en_proceso">En Proceso</option>
                    <option value="completado">Completado</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">Prioridad</label>
                  <select
                    value={currentTask.priority || 'media'}
                    onChange={(e) => setCurrentTask({ ...currentTask, priority: e.target.value as any })}
                    className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm"
                  >
                    <option value="alta">Alta</option>
                    <option value="media">Media</option>
                    <option value="baja">Baja</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                    Vencimiento
                  </label>
                  <input
                    type="date"
                    value={currentTask.dueDate || ''}
                    onChange={(e) => setCurrentTask({ ...currentTask, dueDate: e.target.value })}
                    className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                    Recurrencia
                  </label>
                  <select
                    value={currentTask.recurrence || 'none'}
                    onChange={(e) => setCurrentTask({ ...currentTask, recurrence: e.target.value as any })}
                    className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors cursor-pointer text-sm"
                  >
                    <option value="none">Ninguna</option>
                    <option value="diaria">Diaria</option>
                    <option value="semanal">Semanal</option>
                    <option value="mensual">Mensual</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-widest opacity-70 mb-1">
                    Etiquetas (separadas por comas)
                  </label>
                  <input
                    type="text"
                    value={currentTagsInput}
                    onChange={(e) => setCurrentTagsInput(e.target.value)}
                    className="w-full p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-sm"
                    placeholder="EJ: URGENTE, DISEÑO, BUG"
                  />
                  {formErrors.tags && (
                    <p className="text-[#e63b2e] text-xs font-bold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> {formErrors.tags}
                    </p>
                  )}
                </div>
              </div>

              {/* Tabs Navigation */}
              <div className="flex border-b-2 border-[#1a1a1a] overflow-x-auto custom-scrollbar">
                <button
                  type="button"
                  onClick={() => setActiveTab('description')}
                  className={`px-3 py-2 font-bold uppercase tracking-widest whitespace-nowrap border-r-2 border-[#1a1a1a] transition-colors text-xs ${activeTab === 'description' ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f0e8] hover:bg-gray-200'}`}
                >
                  Descripción
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('subtasks')}
                  className={`px-3 py-2 font-bold uppercase tracking-widest whitespace-nowrap border-r-2 border-[#1a1a1a] transition-colors text-xs ${activeTab === 'subtasks' ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f0e8] hover:bg-gray-200'}`}
                >
                  Subtareas{' '}
                  {currentTask.subtasks && currentTask.subtasks.length > 0 && `(${currentTask.subtasks.length})`}
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('attachments')}
                  className={`px-3 py-2 font-bold uppercase tracking-widest whitespace-nowrap border-r-2 border-[#1a1a1a] transition-colors text-xs ${activeTab === 'attachments' ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f0e8] hover:bg-gray-200'}`}
                >
                  Adjuntos{' '}
                  {(currentTask.attachments?.length || 0) - attachmentsToDelete.length + pendingFiles.length > 0 &&
                    `(${(currentTask.attachments?.length || 0) - attachmentsToDelete.length + pendingFiles.length})`}
                </button>
              </div>

              {/* Tab Contents */}
              <div className="min-h-[200px]">
                {activeTab === 'description' && (
                  <div className="animate-in fade-in duration-200">
                    <textarea
                      value={currentTask.description || ''}
                      onChange={(e) => {
                        setCurrentTask({ ...currentTask, description: e.target.value });
                        if (formErrors.description)
                          setFormErrors((prev) => {
                            const next = { ...prev };
                            delete next.description;
                            return next;
                          });
                      }}
                      className={`w-full h-40 p-3 border-2 bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-medium resize-none transition-colors text-sm ${formErrors.description ? 'border-[#e63b2e] bg-red-50' : 'border-[#1a1a1a]'}`}
                      placeholder="Escribe la descripción de la tarea aquí..."
                    />
                    {formErrors.description && (
                      <p className="text-[#e63b2e] text-xs font-bold mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {formErrors.description}
                      </p>
                    )}
                  </div>
                )}

                {activeTab === 'subtasks' && (
                  <div className="border-2 border-[#1a1a1a] p-3 bg-white animate-in fade-in duration-200">
                    <div className="flex gap-2 mb-3">
                      <input
                        type="text"
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            if (newSubtaskTitle.trim()) {
                              setCurrentTask((prev) => ({
                                ...prev,
                                subtasks: [
                                  ...(prev.subtasks || []),
                                  { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false },
                                ],
                              }));
                              setNewSubtaskTitle('');
                            }
                          }
                        }}
                        className="flex-1 p-3 border-2 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none focus:ring-0 font-bold uppercase transition-colors text-sm"
                        placeholder="NUEVA SUBTAREA..."
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (newSubtaskTitle.trim()) {
                            setCurrentTask((prev) => ({
                              ...prev,
                              subtasks: [
                                ...(prev.subtasks || []),
                                { id: Date.now().toString(), title: newSubtaskTitle.trim(), completed: false },
                              ],
                            }));
                            setNewSubtaskTitle('');
                          }
                        }}
                        className="px-4 py-2 bg-[#1a1a1a] text-white font-bold uppercase text-sm hover:bg-[#333] transition-colors flex items-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Añadir
                      </button>
                    </div>

                    <div className="flex flex-col gap-2">
                      {currentTask.subtasks?.map((subtask) => (
                        <div
                          key={subtask.id}
                          className="flex items-center justify-between p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8] group"
                        >
                          <div className="flex items-center gap-3 flex-1 overflow-hidden">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentTask((prev) => ({
                                  ...prev,
                                  subtasks: prev.subtasks?.map((st) =>
                                    st.id === subtask.id ? { ...st, completed: !st.completed } : st,
                                  ),
                                }));
                              }}
                              className={`w-5 h-5 border-2 border-[#1a1a1a] flex items-center justify-center flex-shrink-0 transition-colors ${subtask.completed ? 'bg-[#00cc66] text-white' : 'bg-white'}`}
                            >
                              {subtask.completed && <CheckCircle className="w-3 h-3" />}
                            </button>
                            <span
                              className={`font-bold uppercase text-sm truncate ${subtask.completed ? 'line-through opacity-50' : ''}`}
                            >
                              {subtask.title}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCurrentTask((prev) => ({
                                ...prev,
                                subtasks: prev.subtasks?.filter((st) => st.id !== subtask.id),
                              }));
                            }}
                            className="p-1 opacity-0 group-hover:opacity-100 hover:bg-[#e63b2e] hover:text-white transition-all flex-shrink-0"
                            title="Eliminar subtarea"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                      {(!currentTask.subtasks || currentTask.subtasks.length === 0) && (
                        <p className="text-xs font-bold uppercase tracking-widest opacity-50 text-center py-2">
                          No hay subtareas
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'attachments' && (
                  <div className="border-2 border-[#1a1a1a] p-3 bg-white animate-in fade-in duration-200">
                    <div className="flex justify-between items-center mb-3">
                      <label className="text-xs font-bold uppercase tracking-widest opacity-70">
                        Archivos Adjuntos
                      </label>
                      <label className="cursor-pointer px-3 py-1.5 bg-[#1a1a1a] text-white font-bold uppercase text-[10px] tracking-widest hover:bg-[#333] transition-colors flex items-center gap-2">
                        <Upload className="w-3.5 h-3.5" /> Subir Archivo
                        <input
                          type="file"
                          className="hidden"
                          multiple
                          onChange={(e) => {
                            if (e.target.files) {
                              setPendingFiles([...pendingFiles, ...Array.from(e.target.files)]);
                            }
                            e.target.value = '';
                          }}
                        />
                      </label>
                    </div>

                    <div className="flex flex-col gap-2">
                      {/* Existing Attachments */}
                      {currentTask.attachments
                        ?.filter((a: any) => !attachmentsToDelete.includes(a as any))
                        .map((att: any, idx: number) => (
                          <div
                            key={`att-${idx}`}
                            className="flex items-center justify-between p-2 border-2 border-[#1a1a1a] bg-[#f5f0e8]"
                          >
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-2 hover:underline truncate max-w-[80%]"
                            >
                              <Paperclip className="w-3.5 h-3.5 flex-shrink-0" />
                              <span className="truncate text-xs font-medium">{att.name}</span>
                            </a>
                            <button
                              type="button"
                              onClick={() => setAttachmentsToDelete([...attachmentsToDelete, att])}
                              className="p-1 hover:bg-[#e63b2e] hover:text-white transition-colors"
                              title="Eliminar archivo"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ))}

                      {/* Pending Attachments */}
                      {pendingFiles.map((file, idx) => (
                        <div
                          key={`pending-${idx}`}
                          className="flex items-center justify-between p-2 border-2 border-dashed border-[#1a1a1a] bg-gray-50"
                        >
                          <div className="flex items-center gap-2 truncate max-w-[80%] opacity-70">
                            <Paperclip className="w-4 h-4 flex-shrink-0" />
                            <span className="truncate text-sm font-medium">{file.name} (Pendiente)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setPendingFiles(pendingFiles.filter((_, i) => i !== idx))}
                            className="p-1 hover:bg-[#e63b2e] hover:text-white transition-colors"
                            title="Cancelar subida"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}

                      {(!currentTask.attachments ||
                        currentTask.attachments.length === 0 ||
                        currentTask.attachments.length === attachmentsToDelete.length) &&
                        pendingFiles.length === 0 && (
                          <p className="text-xs font-bold uppercase tracking-widest opacity-50 text-center py-4">
                            No hay archivos adjuntos
                          </p>
                        )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border-2 border-[#1a1a1a] bg-white font-black uppercase tracking-widest hover:bg-gray-100 transition-colors text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 border-2 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                >
                  {isUploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Guardando...
                    </>
                  ) : isEditing ? (
                    'Guardar Cambios'
                  ) : (
                    'Añadir Tarea'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
