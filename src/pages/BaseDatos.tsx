import {
  Users,
  MapPin,
  Server,
  Edit,
  Trash2,
  Download,
  Upload,
  AlertTriangle,
  Plus,
  X,
  FileJson,
  FileSpreadsheet,
  Crosshair,
  Layout,
  Monitor,
  Globe,
  Settings,
  ShieldCheck,
  MoreHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect, useRef } from 'react';
import { getPersonal, addPersonal, updatePersonal, deletePersonal, onPersonalChange } from '../db/personal';
import { getLocations, addLocation, updateLocation, deleteLocation, onLocationsChange } from '../db/locations';
import { getCategories, addCategory, updateCategory, deleteCategory, onCategoriesChange } from '../db/diligenciamientos';
import { supabase, getCurrentUserId } from '../db/client';
import * as XLSX from 'xlsx';
import { useOutletContext } from 'react-router-dom';
import { personalSchema, locationSchema } from '../utils/validation';
import { SkeletonPage } from '../components/Skeleton';
import { DataTable } from '../components/DataTable';
import type { Personal, Location, DiligenciamientoCategory } from '../types';
import LocationMapPicker from '../components/LocationMapPicker';

function handleError(error: unknown) {
  console.error('Error:', error);
  toast.error('Error al procesar la solicitud');
}

const ICON_OPTIONS = [
  { name: 'Monitor', icon: Monitor },
  { name: 'Globe', icon: Globe },
  { name: 'Settings', icon: Settings },
  { name: 'ShieldCheck', icon: ShieldCheck },
  { name: 'Layout', icon: Layout },
  { name: 'MoreHorizontal', icon: MoreHorizontal },
];

const COLOR_OPTIONS = [
  { name: 'Azul', value: 'bg-[#0055ff]' },
  { name: 'Verde', value: 'bg-[#00cc66]' },
  { name: 'Naranja', value: 'bg-[#ff9900]' },
  { name: 'Negro', value: 'bg-[#1a1a1a]' },
  { name: 'Rojo', value: 'bg-[#e63b2e]' },
  { name: 'Gris', value: 'bg-gray-500' },
];

export default function BaseDatos() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importCollection, setImportCollection] = useState('tasks');
  const [importPreview, setImportPreview] = useState<any[]>([]);
  const [importMode, setImportMode] = useState<'single' | 'multi'>('single');
  const [importDataMap, setImportDataMap] = useState<Record<string, any[]>>({});
  const [importStatus, setImportStatus] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Data states
  const [personnel, setPersonnel] = useState<Personal[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [categories, setCategories] = useState<DiligenciamientoCategory[]>([]);

  // System stats
  const [systemStats, setSystemStats] = useState({
    totalRecords: 0,
    collections: {} as Record<string, number>,
    lastBackup: new Date().toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }),
  });

  // Modal states
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<Personal | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [editingCategory, setEditingCategory] = useState<DiligenciamientoCategory | null>(null);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);

  // Form states
  const [personalForm, setPersonalForm] = useState({ name: '', role: '', status: 'Activo' });
  const [locationForm, setLocationForm] = useState({
    name: '',
    type: 'Origen',
    status: 'Operativo',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    icon: 'Layout',
    color: 'bg-[#1a1a1a]',
  });

  // Filter states
  const [personalFilter, setPersonalFilter] = useState('Todos');
  const [locationFilter, setLocationFilter] = useState('Todos');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubPersonal = onPersonalChange((data) => {
      setPersonnel(data);
    });

    const unsubLocations = onLocationsChange((data) => {
      setLocations(data);
      setLoading(false);
    });

    const unsubCategories = onCategoriesChange((data) => {
      setCategories(data);
    });

    const fetchStats = async () => {
      const cols = [
        'tasks',
        'visitas',
        'novedades',
        'personal',
        'locations',
        'task_history',
        'notifications',
        'diligenciamientos',
        'diligenciamiento_categories',
      ];
      const counts: Record<string, number> = {};
      let total = 0;

      for (const col of cols) {
        try {
          const { count, error } = await supabase.from(col).select('*', { count: 'exact', head: true });
          if (error) throw error;
          counts[col] = count || 0;
          total += count || 0;
        } catch {
          counts[col] = 0;
        }
      }

      setSystemStats({
        totalRecords: total,
        collections: counts,
        lastBackup: new Date().toLocaleString('es-ES', { hour: '2-digit', minute: '2-digit' }),
      });
    };
    fetchStats();

    // Auto-refresh when user returns to tab
    const onFocus = () => fetchStats();
    window.addEventListener('focus', onFocus);

    return () => {
      unsubPersonal();
      unsubLocations();
      unsubCategories();
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = personalSchema.safeParse(personalForm);
    if (!result.success) {
      result.error.issues.forEach((err) => toast.error(err.message));
      return;
    }

    try {
      if (editingPersonal) {
        await updatePersonal(editingPersonal.id, {
          name: result.data.name,
          role: result.data.role,
          status: result.data.status,
        });
        toast.success('Personal actualizado');
      } else {
        await addPersonal({
          name: result.data.name,
          role: result.data.role,
          status: result.data.status,
        });
        toast.success('Personal añadido');
      }
      setIsPersonalModalOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeletePersonal = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de personal?')) return;
    try {
      await deletePersonal(id);
      toast.success('Personal eliminado');
    } catch (error) {
      handleError(error);
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = locationSchema.safeParse(locationForm);
    if (!result.success) {
      result.error.issues.forEach((err) => toast.error(err.message));
      return;
    }

    try {
      const coords: Record<string, number | undefined> = {};
      if (typeof locationForm.latitude === 'number' && !isNaN(locationForm.latitude)) {
        coords.latitude = locationForm.latitude;
      }
      if (typeof locationForm.longitude === 'number' && !isNaN(locationForm.longitude)) {
        coords.longitude = locationForm.longitude;
      }

      if (editingLocation) {
        await updateLocation(editingLocation.id, {
          name: result.data.name,
          type: result.data.type,
          status: result.data.status,
          ...coords,
        });
        toast.success('Ubicación actualizada');
      } else {
        await addLocation({
          name: result.data.name,
          type: result.data.type,
          status: result.data.status,
          latitude: locationForm.latitude,
          longitude: locationForm.longitude,
        });
        toast.success('Ubicación añadida');
      }
      setIsLocationModalOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm('¿Eliminar esta ubicación?')) return;
    try {
      await deleteLocation(id);
      toast.success('Ubicación eliminada');
    } catch (error) {
      handleError(error);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryForm.name.trim()) return;

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, categoryForm);
        toast.success('Módulo actualizado');
      } else {
        await addCategory(categoryForm);
        toast.success('Módulo añadido');
      }
      setIsCategoryModalOpen(false);
    } catch (error) {
      handleError(error);
    }
  };

  const handleDeleteCategory = async (id: string) => {
    if (!window.confirm('¿Eliminar este módulo? Los registros existentes se moverán a OTROS.')) return;
    try {
      await deleteCategory(id);
      toast.success('Módulo eliminado');
    } catch (error) {
      handleError(error);
    }
  };

  const handleExportJSON = async () => {
    setIsExporting(true);
    try {
      const collectionsToExport = ['tasks', 'visitas', 'novedades', 'task_history', 'personal', 'locations', 'notifications', 'users'];
      const backupData: Record<string, any[]> = {};

      for (const col of collectionsToExport) {
        try {
          const { data, error } = await supabase.from(col).select('*');
          if (error) throw error;
          backupData[col] = data || [];
        } catch {
          backupData[col] = [];
        }
      }

      const jsonString = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sgo_pzbp_full_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success('Backup JSON descargado con éxito');
    } catch (error) {
      console.error('Error exportando JSON:', error);
      toast.error('Error al exportar los datos');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const collectionsToExport = ['tasks', 'visitas', 'novedades', 'task_history'];
      const workbook = XLSX.utils.book_new();

      const sheetConfigurations: Record<
        string,
        { title: string; columns: { key: string; header: string; width: number }[] }
      > = {
        tasks: {
          title: 'TAREAS OPERATIVAS',
          columns: [
            { key: 'title', header: 'Título', width: 30 },
            { key: 'priority', header: 'Prioridad', width: 12 },
            { key: 'status', header: 'Estado', width: 14 },
            { key: 'dueDate', header: 'Vencimiento', width: 14 },
            { key: 'description', header: 'Descripción', width: 40 },
            { key: 'createdAt', header: 'Fecha Creación', width: 20 },
          ],
        },
        visitas: {
          title: 'VISITAS TÉCNICAS',
          columns: [
            { key: 'fecha', header: 'Fecha', width: 14 },
            { key: 'hora', header: 'Hora', width: 10 },
            { key: 'origen', header: 'Origen', width: 22 },
            { key: 'destino', header: 'Destino', width: 22 },
            { key: 'responsable', header: 'Responsable', width: 24 },
            { key: 'observaciones', header: 'Observaciones', width: 40 },
          ],
        },
        novedades: {
          title: 'NOVEDADES',
          columns: [
            { key: 'createdAt', header: 'Fecha', width: 22 },
            { key: 'title', header: 'Título', width: 30 },
            { key: 'authorName', header: 'Autor', width: 20 },
            { key: 'content', header: 'Contenido', width: 50 },
          ],
        },
        task_history: {
          title: 'HISTORIAL DE TAREAS',
          columns: [
            { key: 'taskId', header: 'ID Tarea', width: 24 },
            { key: 'action', header: 'Acción', width: 16 },
            { key: 'timestamp', header: 'Fecha/Hora', width: 20 },
            { key: 'userId', header: 'Usuario', width: 24 },
            { key: 'details', header: 'Detalles', width: 40 },
          ],
        },
      };

      for (const colName of collectionsToExport) {
        const { data, error } = await supabase.from(colName).select('*');
        if (error) throw error;
        const dataRows = data || [];
        const config = sheetConfigurations[colName];

        const worksheetData: any[] = [];

        // Title and metadata
        worksheetData.push({ A: config?.title || colName.toUpperCase() });
        worksheetData.push({ A: `Respaldo generado: ${new Date().toLocaleString('es-ES')}` });
        worksheetData.push({ A: `Total de registros: ${dataRows.length}` });
        worksheetData.push({}); // spacer

        if (dataRows.length > 0 && config) {
          // Header row
          const headerRow: Record<string, string> = {};
          config.columns.forEach((col, idx) => {
            headerRow[String.fromCharCode(65 + idx)] = col.header;
          });
          worksheetData.push(headerRow);

          // Data rows
          dataRows.forEach((record) => {
            const row: Record<string, any> = {};
            config.columns.forEach((col, idx) => {
              const cellRef = String.fromCharCode(65 + idx);
              let val = (record as Record<string, any>)[col.key];
              if (val === null || val === undefined) val = '';
              if (typeof val === 'object') {
                if (Array.isArray(val)) {
                  val = `${val.length} elemento(s)`;
                } else {
                  val = JSON.stringify(val).slice(0, 40);
                }
              }
              if (col.key === 'createdAt' || col.key === 'timestamp') {
                try {
                  const d = new Date(val);
                  if (!isNaN(d.getTime())) val = d.toLocaleString('es-ES');
                } catch {
                  /* fall through */
                }
              }
              row[cellRef] = String(val).slice(0, 100);
            });
            worksheetData.push(row);
          });
        } else if (dataRows.length > 0) {
          // Fallback: export all columns
          worksheetData.push({ A: 'Datos exportados (formato estándar)' });
          dataRows.forEach((record, idx) => {
            worksheetData.push({ A: `Registro ${idx + 1}`, B: JSON.stringify(record).slice(0, 100) });
          });
        } else {
          worksheetData.push({ A: 'Sin datos disponibles' });
        }

        const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });

        // Set column widths
        if (config) {
          const wscols = config.columns.map((col) => ({ wch: col.width }));
          worksheet['!cols'] = wscols;
          worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: config.columns.length - 1 } }];
        }

        XLSX.utils.book_append_sheet(workbook, worksheet, config?.title || colName.toUpperCase());
      }

      XLSX.writeFile(workbook, `Respaldo_Sistema_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Exportación a Excel completada');
    } catch (error) {
      toast.error('Error al exportar datos');
      console.error(error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFile(file);
    setImportStatus('');
    setImportMode('single');
    setImportDataMap({});

    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();

    if (ext === 'json') {
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target?.result as string);
          
          // Detect multi-table backup
          const multiTableKeys = ['tasks', 'visitas', 'novedades', 'personal', 'locations', 'users'];
          const isMultiTable = !Array.isArray(data) && multiTableKeys.some(key => key in data);

          if (isMultiTable) {
            setImportMode('multi');
            setImportDataMap(data);
            const totalRecords = Object.values(data).reduce((acc: number, curr: any) => acc + (Array.isArray(curr) ? curr.length : 0), 0);
            setImportPreview([]); 
            toast.success(`Backup multi-tabla detectado: ${totalRecords} registros totales`);
          } else {
            const records = Array.isArray(data) ? data : data.registros || data.records || data.datos || [];
            setImportPreview(records);
            toast.success(`${records.length} registros encontrados en el archivo`);
          }
        } catch {
          toast.error('Error al leer el archivo JSON');
          setImportFile(null);
        }
      };
      reader.readAsText(file);
    } else if (ext === 'xlsx' || ext === 'xls' || ext === 'csv') {
      reader.onload = (event) => {
        try {
          const workbook = XLSX.read(event.target?.result, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json(worksheet);
          setImportPreview(data);
          toast.success(`${data.length} registros encontrados en el archivo`);
        } catch {
          toast.error('Error al leer el archivo Excel');
          setImportFile(null);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      toast.error('Formato no soportado. Usá JSON, Excel o CSV');
      setImportFile(null);
    }
  };

  const handleImportData = async () => {
    if (!importFile || (importMode === 'single' && importPreview.length === 0)) {
      toast.error('Seleccioná un archivo con datos');
      return;
    }

    setIsImporting(true);
    setImportStatus('Iniciando proceso...');

    // Helper to map camelCase fields from old backups to snake_case Supabase columns
    const mapRecord = (record: any, tableName: string) => {
      const mapping: Record<string, string> = {
        authorId: 'author_id',
        authorName: 'author_name',
        createdAt: tableName === 'task_history' ? 'timestamp' : 'created_at',
        dueDate: 'due_date',
        photoURL: 'photo_url',
        taskId: 'task_id',
        taskTitle: 'task_title',
        userId: 'user_id',
        userEmail: 'user_email',
        recipientId: 'recipient_id',
        assignedTo: 'assigned_to',
      };

      // Define columns that must be UUIDs in the database
      const uuidColumns = [
        'id', 
        'author_id', 
        'assigned_to', 
        'user_id', 
        'task_id', 
        'recipient_id'
      ];

      // Helper to convert any string to a deterministic valid UUID format
      const toUUID = (str: any) => {
        if (!str || typeof str !== 'string') return str;
        // Check if already a valid UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (uuidRegex.test(str)) return str;

        // Otherwise, convert to deterministic hex string
        let hex = '';
        for (let i = 0; i < str.length; i++) {
          hex += str.charCodeAt(i).toString(16);
        }
        // Pad or truncate to 32 hex chars
        hex = (hex + '00000000000000000000000000000000').slice(0, 32);
        // Format as xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
      };

      // Define allowed columns for each table to avoid 400 errors due to unknown columns
      const allowedColumns: Record<string, string[]> = {
        users: ['id', 'name', 'email', 'role', 'photo_url', 'created_at'],
        locations: ['id', 'name', 'type', 'status', 'latitude', 'longitude', 'author_id', 'created_at'],
        personal: ['id', 'name', 'role', 'status', 'author_id', 'created_at'],
        tasks: ['id', 'title', 'description', 'priority', 'status', 'due_date', 'author_id', 'assigned_to', 'tags', 'attachments', 'subtasks', 'comments', 'recurrence', 'created_at'],
        visitas: ['id', 'origen', 'destino', 'fecha', 'hora', 'responsable', 'observaciones', 'comments', 'author_id', 'created_at'],
        novedades: ['id', 'title', 'content', 'author_id', 'author_name', 'attachments', 'created_at'],
        task_history: ['id', 'task_id', 'task_title', 'action', 'user_id', 'user_email', 'timestamp'],
        notifications: ['id', 'title', 'message', 'type', 'author_id', 'recipient_id', 'created_at'],
        diligenciamientos: ['id', 'title', 'content', 'category', 'fecha', 'author_id', 'author_name', 'attachments', 'created_at'],
        diligenciamiento_categories: ['id', 'name', 'icon', 'color', 'author_id', 'created_at'],
      };

      const newRecord: any = {};
      const columns = allowedColumns[tableName] || [];
      const currentUserId = getCurrentUserId();

      Object.keys(record).forEach((key) => {
        let mappedKey = mapping[key] || key;

        // Only include the column if it's in our allowed list
        if (columns.length === 0 || columns.includes(mappedKey)) {
          let value = record[key];

          // Apply UUID conversion if necessary
          if (uuidColumns.includes(mappedKey)) {
            value = toUUID(value);
          }

          // Replace foreign key author columns with current user to avoid FK violations
          if (mappedKey === 'author_id') {
            value = currentUserId || value;
          }

          // Skip empty date fields - PostgreSQL date columns reject empty strings
          if (value === '' && (mappedKey === 'due_date' || mappedKey === 'created_at' || mappedKey === 'fecha' || mappedKey === 'hora' || mappedKey === 'timestamp')) {
            return;
          }

          newRecord[mappedKey] = value;
        }
      });

      // Ensure mandatory columns have some value if they are missing
      if (columns.includes('created_at') && !newRecord.created_at) {
        newRecord.created_at = new Date().toISOString();
      }
      if (columns.includes('timestamp') && !newRecord.timestamp) {
        newRecord.timestamp = new Date().toISOString();
      }

      return newRecord;
    };

    try {
      if (importMode === 'multi') {
        const order = ['users', 'locations', 'personal', 'tasks', 'visitas', 'novedades', 'task_history', 'notifications', 'diligenciamientos', 'diligenciamiento_categories'];
        let totalSuccess = 0;

        for (const table of order) {
          const rawRecords = importDataMap[table];
          if (!rawRecords || !Array.isArray(rawRecords) || rawRecords.length === 0) continue;

          // Map and filter records before upsert
          const records = rawRecords.map(r => mapRecord(r, table));

          setImportStatus(`Importando ${table.toUpperCase()} (${records.length} registros)...`);
          
          const { error } = await supabase.from(table).upsert(records, { onConflict: 'id' });
          
          if (error) {
            console.error(`Error en ${table}:`, error);
            toast.error(`Error en tabla ${table}: ${error.message} (${error.code})`);
            // Continue with other tables even if one fails
          } else {
            totalSuccess += records.length;
          }
        }
        
        toast.success(`Restauración masiva completada: ${totalSuccess} registros actualizados`);
      } else {
        setImportStatus(`Importando ${importPreview.length} registros a ${importCollection}...`);
        
        // Map and filter records before upsert
        const records = importPreview.map(r => mapRecord(r, importCollection));

        // Single table import with upsert to prevent duplicates
        const { error } = await supabase.from(importCollection).upsert(records, { onConflict: 'id' });
        
        if (error) {
          console.error('Error importing records:', error);
          toast.error(`Error al importar: ${error.message} (${error.code})`);
        } else {
          toast.success(`Importación completada: ${importPreview.length} registros actualizados`);
        }
      }

      setIsImportModalOpen(false);
      setImportFile(null);
      setImportPreview([]);
      setImportDataMap({});
      setImportStatus('');
      setImportCollection('tasks');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error(error);
      toast.error('Error al importar datos');
    } finally {
      setIsImporting(false);
    }
  };

  const handleMassDelete = async () => {
    if (deleteConfirmation !== 'CONFIRMAR') {
      toast.error('Debes escribir CONFIRMAR para proceder');
      return;
    }

    setIsDeleting(true);
    try {
      const collectionsToBackup = [
        'tasks',
        'visitas',
        'novedades',
        'task_history',
        'personal',
        'locations',
        'notifications',
      ];
      const backupData: Record<string, unknown[]> = {};

      for (const colName of collectionsToBackup) {
        const { data, error } = await supabase.from(colName).select('*');
        if (error) throw error;
        backupData[colName] = data || [];
      }

      const totalRecords = Object.values(backupData).reduce((sum, arr) => sum + arr.length, 0);
      if (totalRecords > 0) {
        const workbook = XLSX.utils.book_new();
        for (const [colName, data] of Object.entries(backupData)) {
          if (data.length > 0) {
            const worksheet = XLSX.utils.json_to_sheet(data);
            XLSX.utils.book_append_sheet(workbook, worksheet, colName.toUpperCase());
          }
        }
        XLSX.writeFile(workbook, `Respaldo_PRE_Borrado_${new Date().toISOString().replace(/[:.]/g, '-')}.xlsx`);
        toast.success('Respaldo automático creado antes del borrado');
      }

      const collectionsToDelete = [
        'tasks',
        'visitas',
        'novedades',
        'task_history',
        'notifications',
        'personal',
        'locations',
      ];

      for (const colName of collectionsToDelete) {
        await supabase.from(colName).delete().neq('id', '');
      }

      toast.success('Base de datos limpiada exitosamente');
      setDeleteConfirmation('');
    } catch (error) {
      toast.error('Error al limpiar la base de datos. Verifica tus permisos.');
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto">
      {loading ? (
        <SkeletonPage title="Administración de Datos" cardCount={4} layout="table" />
      ) : (
        <>
          <h1 className="text-4xl font-black uppercase mb-6 font-['Space_Grotesk'] tracking-tighter">
            Administración de Datos
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
            <DataTable<Personal>
              data={personnel}
              columns={[
                { key: 'name', label: 'Nombre' },
                { key: 'role', label: 'Rol' },
                {
                  key: 'status',
                  label: 'Estado',
                  render: (p) => (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-[#1a1a1a] ${p.status === 'Activo' ? 'bg-[#00cc66] text-white' : 'bg-[#e63b2e] text-white'}`}
                    >
                      {p.status}
                    </span>
                  ),
                },
              ]}
              filterValue={personalFilter}
              filterField="status"
              filterOptions={['Todos', 'Activo', 'Inactivo']}
              onFilterChange={setPersonalFilter}
              onAdd={() => {
                setEditingPersonal(null);
                setPersonalForm({ name: '', role: '', status: 'Activo' });
                setIsPersonalModalOpen(true);
              }}
              onEdit={(p) => {
                setEditingPersonal(p);
                setPersonalForm({ name: p.name, role: p.role, status: p.status });
                setIsPersonalModalOpen(true);
              }}
              onDelete={(p) => handleDeletePersonal(p.id)}
              addLabel="Añadir"
              accentColor="#0055ff"
            />

            <DataTable<Location>
              data={locations}
              columns={[
                { key: 'name', label: 'Ubicación' },
                { key: 'type', label: 'Tipo' },
                {
                  key: 'status',
                  label: 'Estado',
                  render: (l) => (
                    <span
                      className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-[#1a1a1a] ${l.status === 'Operativo' ? 'bg-[#00cc66] text-white' : l.status === 'Mantenimiento' ? 'bg-[#0055ff] text-white' : 'bg-[#e63b2e] text-white'}`}
                    >
                      {l.status}
                    </span>
                  ),
                },
              ]}
              filterValue={locationFilter}
              filterField="status"
              filterOptions={['Todos', 'Operativo', 'Mantenimiento', 'Inactivo']}
              onFilterChange={setLocationFilter}
              onAdd={() => {
                setEditingLocation(null);
                setLocationForm({
                  name: '',
                  type: 'Origen',
                  status: 'Operativo',
                  latitude: undefined,
                  longitude: undefined,
                });
                setIsLocationModalOpen(true);
              }}
              onEdit={(l) => {
                setEditingLocation(l);
                setLocationForm({
                  name: l.name,
                  type: l.type,
                  status: l.status,
                  latitude: l.latitude ?? undefined,
                  longitude: l.longitude ?? undefined,
                });
                setIsLocationModalOpen(true);
              }}
              onDelete={(l) => handleDeleteLocation(l.id)}
              addLabel="Añadir"
              accentColor="#0055ff"
            />

            <DataTable<DiligenciamientoCategory>
              data={categories}
              columns={[
                { 
                  key: 'name', 
                  label: 'Módulo',
                  render: (c) => (
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${c.color} border-2 border-[#1a1a1a] flex items-center justify-center text-white`}>
                        {(() => {
                          const IconComp = (LucideIcons as any)[c.icon] || Layout;
                          return <IconComp className="w-4 h-4" />;
                        })()}
                      </div>
                      <span className="font-bold">{c.name}</span>
                    </div>
                  )
                },
                { 
                  key: 'icon', 
                  label: 'Icono',
                  render: (c) => <span className="text-[10px] font-black opacity-40">{c.icon}</span>
                },
              ]}
              onAdd={() => {
                setEditingCategory(null);
                setCategoryForm({ name: '', icon: 'Layout', color: 'bg-[#1a1a1a]' });
                setIsCategoryModalOpen(true);
              }}
              onEdit={(c) => {
                setEditingCategory(c);
                setCategoryForm({ name: c.name, icon: c.icon, color: c.color });
                setIsCategoryModalOpen(true);
              }}
              onDelete={(c) => handleDeleteCategory(c.id)}
              addLabel="Módulo"
              accentColor="#ff9900"
            />

            {/* System Status & Actions */}
            <div className="lg:col-span-2 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] p-6 shadow-[8px_8px_0px_0px_rgba(0,85,255,1)]">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b-2 border-white pb-3">
                <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
                  <Server className="w-5 h-5" /> Estado y Mantenimiento
                </h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setIsImportModalOpen(true)}
                    className="px-3 py-1.5 border-2 border-white bg-[#0055ff] text-white font-black uppercase text-xs tracking-widest hover:bg-white hover:text-[#0055ff] transition-colors flex items-center gap-2 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                  >
                    <Upload className="w-3.5 h-3.5" /> Importar Datos
                  </button>
                  <button
                    onClick={handleExportExcel}
                    disabled={isExporting}
                    className="px-3 py-1.5 border-2 border-white bg-[#00cc66] text-[#1a1a1a] font-black uppercase text-xs tracking-widest hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                  >
                    <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exportando...' : 'Exportar Excel'}
                  </button>
                  <button
                    onClick={handleExportJSON}
                    disabled={isExporting}
                    className="px-3 py-1.5 border-2 border-white bg-[#e63b2e] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#e63b2e] transition-colors flex items-center gap-2 disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                  >
                    <FileJson className="w-3.5 h-3.5" /> FULL BACKUP JSON
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 border-2 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">
                    Total Registros
                  </p>
                  <p className="text-2xl font-black font-['Space_Grotesk'] flex items-center gap-2">
                    <span className="w-3 h-3 bg-[#00cc66] rounded-full inline-block border-2 border-current"></span>
                    {systemStats.totalRecords}
                  </p>
                </div>
                <div className="p-4 border-2 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">
                    Última Actividad
                  </p>
                  <p className="text-2xl font-black font-['Space_Grotesk']">{systemStats.lastBackup}</p>
                </div>
                <div className="p-4 border-2 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">
                    Colecciones Activas
                  </p>
                  <p className="text-2xl font-black font-['Space_Grotesk']">
                    {Object.values(systemStats.collections || {}).filter((c) => c > 0).length}/9
                  </p>
                </div>
              </div>

              {/* Collection Breakdown */}
              <div className="mb-6 p-4 border-2 border-white/20 bg-[#1a1a1a]">
                <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-3">
                  Desglose por Colección
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Tareas', key: 'tasks', color: '#3b82f6' },
                    { label: 'Visitas', key: 'visitas', color: '#10b981' },
                    { label: 'Novedades', key: 'novedades', color: '#f59e0b' },
                    { label: 'Personal', key: 'personal', color: '#8b5cf6' },
                    { label: 'Ubicaciones', key: 'locations', color: '#06b6d4' },
                    { label: 'Historial', key: 'task_history', color: '#ec4899' },
                    { label: 'Notificaciones', key: 'notifications', color: '#f43f5e' },
                    { label: 'Diligenciamientos', key: 'diligenciamientos', color: '#0055ff' },
                    { label: 'Módulos', key: 'diligenciamiento_categories', color: '#ff9900' },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }}></div>
                      <span className="text-[10px] font-bold uppercase opacity-60">{item.label}:</span>
                      <span className="text-sm font-black">{(systemStats.collections || {})[item.key] || 0}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              {isAdmin && (
                <div className="border-2 border-[#e63b2e] p-5 bg-[#1a1a1a] relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <AlertTriangle className="w-24 h-24 text-[#e63b2e]" />
                  </div>
                  <h3 className="text-lg font-black uppercase text-[#e63b2e] mb-2 flex items-center gap-2 relative z-10">
                    <AlertTriangle className="w-4 h-4" /> Zona de Peligro
                  </h3>
                  <p className="text-xs font-bold opacity-80 mb-3 relative z-10 max-w-2xl">
                    El borrado masivo eliminará permanentemente todas las tareas, visitas, novedades y notificaciones.
                    Esta acción no se puede deshacer. Por favor, exporta un respaldo antes de proceder.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 relative z-10">
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Escribe CONFIRMAR"
                      className="p-2 border-2 border-[#e63b2e] bg-[#1a1a1a] text-white focus:outline-none focus:bg-[#e63b2e]/10 font-bold uppercase text-sm w-full sm:w-64"
                    />
                    <button
                      onClick={handleMassDelete}
                      disabled={isDeleting || deleteConfirmation !== 'CONFIRMAR'}
                      className="px-4 py-2 border-2 border-[#e63b2e] bg-[#e63b2e] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#e63b2e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[2px_2px_0px_0px_rgba(230,59,46,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? 'Borrando...' : 'Borrado Masivo'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Personal Modal */}
          {isPersonalModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase font-['Space_Grotesk']">
                    {editingPersonal ? 'Editar Personal' : 'Añadir Personal'}
                  </h2>
                  <button
                    onClick={() => setIsPersonalModalOpen(false)}
                    className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSavePersonal} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Nombre</label>
                    <input
                      type="text"
                      value={personalForm.name}
                      onChange={(e) => setPersonalForm({ ...personalForm, name: e.target.value })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Rol</label>
                    <input
                      type="text"
                      value={personalForm.role}
                      onChange={(e) => setPersonalForm({ ...personalForm, role: e.target.value })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Estado</label>
                    <select
                      value={personalForm.status}
                      onChange={(e) => setPersonalForm({ ...personalForm, status: e.target.value })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                    >
                      <option value="Activo">Activo</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="mt-4 w-full py-4 border-4 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    {editingPersonal ? 'Guardar Cambios' : 'Añadir Personal'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Location Modal */}
          {isLocationModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase font-['Space_Grotesk']">
                    {editingLocation ? 'Editar Ubicación' : 'Añadir Ubicación'}
                  </h2>
                  <button
                    onClick={() => setIsLocationModalOpen(false)}
                    className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSaveLocation} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">
                      Nombre de Ubicación
                    </label>
                    <input
                      type="text"
                      value={locationForm.name}
                      onChange={(e) => setLocationForm({ ...locationForm, name: e.target.value })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Tipo</label>
                    <select
                      value={locationForm.type}
                      onChange={(e) => setLocationForm({ ...locationForm, type: e.target.value })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                    >
                      <option value="Origen">Origen</option>
                      <option value="Destino">Destino</option>
                      <option value="Origen/Destino">Origen/Destino</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Estado</label>
                    <select
                      value={locationForm.status}
                      onChange={(e) => setLocationForm({ ...locationForm, status: e.target.value })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                    >
                      <option value="Operativo">Operativo</option>
                      <option value="Mantenimiento">Mantenimiento</option>
                      <option value="Inactivo">Inactivo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">
                      Ubicación en Mapa
                    </label>
                    <div className="flex gap-2 items-center">
                      <button
                        type="button"
                        onClick={() => setIsMapPickerOpen(true)}
                        className="flex-1 py-3 border-4 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-sm tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,0.3)] flex items-center justify-center gap-2"
                      >
                        <Crosshair className="w-4 h-4" />{' '}
                        {locationForm.latitude && locationForm.longitude ? 'Cambiar ubicación' : 'Seleccionar en mapa'}
                      </button>
                    </div>
                    {locationForm.latitude && locationForm.longitude && (
                      <p className="text-xs font-bold opacity-60 mt-1 font-mono">
                        📍 {locationForm.latitude.toFixed(4)}, {locationForm.longitude.toFixed(4)}
                      </p>
                    )}
                  </div>
                  <button
                    type="submit"
                    className="mt-4 w-full py-4 border-4 border-[#1a1a1a] bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    {editingLocation ? 'Guardar Cambios' : 'Añadir Ubicación'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Import Modal */}
          {isImportModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
                    <Upload className="w-6 h-6" /> Importar Datos
                  </h2>
                  <button
                    onClick={() => {
                      setIsImportModalOpen(false);
                      setImportFile(null);
                      setImportPreview([]);
                    }}
                    className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                {/* Collection Selector */}
                {importMode === 'single' && (
                  <div className="mb-5">
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">
                      Colección de destino
                    </label>
                    <select
                      value={importCollection}
                      onChange={(e) => setImportCollection(e.target.value)}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase text-sm transition-colors"
                    >
                      <option value="tasks">Tareas Operativas</option>
                      <option value="visitas">Visitas Técnicas</option>
                      <option value="novedades">Novedades</option>
                      <option value="personal">Personal</option>
                      <option value="locations">Ubicaciones</option>
                      <option value="task_history">Historial de Tareas</option>
                      <option value="notifications">Notificaciones</option>
                    </select>
                  </div>
                )}

                {/* File Upload */}
                <div className="mb-5">
                  <label className="block text-xs font-black uppercase tracking-widest mb-2">Archivo de datos</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json,.xlsx,.xls,.csv"
                    onChange={handleImportFile}
                    className="w-full p-3 border-4 border-dashed border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold text-sm transition-colors cursor-pointer"
                  />
                  <p className="text-[10px] font-bold opacity-50 mt-2">Formatos soportados: JSON, Excel (.xlsx), CSV</p>
                  {importFile && (
                    <div className="mt-2 p-2 bg-green-50 border-2 border-green-400 text-green-800 text-xs font-bold flex items-center gap-2">
                      <FileJson className="w-4 h-4" /> {importFile.name} {importMode === 'single' ? `(${importPreview.length} registros)` : '(Backup Full)'}
                    </div>
                  )}
                </div>

                {/* Status Indicator */}
                {importStatus && (
                  <div className="mb-5 p-3 border-4 border-[#0055ff] bg-[#0055ff]/10 text-[#0055ff] text-xs font-black uppercase tracking-widest flex items-center gap-3">
                    <div className="w-3 h-3 border-2 border-[#0055ff] border-t-transparent rounded-full animate-spin"></div>
                    {importStatus}
                  </div>
                )}

                {/* Preview / Summary */}
                {importMode === 'single' && importPreview.length > 0 && (
                  <div className="mb-5">
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">
                      Vista previa (primeros 3 registros)
                    </label>
                    <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3 max-h-40 overflow-y-auto text-[10px] font-mono">
                      {importPreview.slice(0, 3).map((record, idx) => (
                        <div key={idx} className="mb-2 p-2 bg-white border border-[#1a1a1a]">
                          <pre className="whitespace-pre-wrap overflow-hidden text-ellipsis">
                            {JSON.stringify(record, null, 2).slice(0, 200)}...
                          </pre>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {importMode === 'multi' && Object.keys(importDataMap).length > 0 && (
                  <div className="mb-5">
                    <label className="block text-xs font-black uppercase tracking-widest mb-2">
                      Resumen del Backup (Tablas detectadas)
                    </label>
                    <div className="border-2 border-[#1a1a1a] bg-[#f5f0e8] p-3 max-h-48 overflow-y-auto">
                      <div className="grid grid-cols-1 gap-2">
                        {Object.entries(importDataMap)
                          .filter(([_, data]) => Array.isArray(data) && data.length > 0)
                          .map(([table, data]) => (
                            <div
                              key={table}
                              className="flex items-center justify-between p-2 bg-white border-2 border-[#1a1a1a] text-[10px] font-black uppercase"
                            >
                              <span className="flex items-center gap-2">
                                <Server className="w-3 h-3 text-[#0055ff]" />
                                {table}
                              </span>
                              <span className="bg-[#1a1a1a] text-white px-2 py-0.5">
                                {Array.isArray(data) ? data.length : 0} registros
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Import Button */}
                <button
                  onClick={handleImportData}
                  disabled={
                    isImporting ||
                    !importFile ||
                    (importMode === 'single' && importPreview.length === 0) ||
                    (importMode === 'multi' && Object.keys(importDataMap).length === 0)
                  }
                  className="w-full py-4 border-4 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase tracking-widest text-sm hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isImporting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>{' '}
                      Importando...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      {importMode === 'single'
                        ? `Importar ${importPreview.length} Registros`
                        : `Importar ${Object.keys(importDataMap).filter((k) => Array.isArray(importDataMap[k]) && importDataMap[k].length > 0).length} Tablas`}
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Category Modal */}
          {isCategoryModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-white border-4 border-[#1a1a1a] shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-black uppercase font-['Space_Grotesk']">
                    {editingCategory ? 'Editar Módulo' : 'Nuevo Módulo'}
                  </h2>
                  <button
                    onClick={() => setIsCategoryModalOpen(false)}
                    className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
                <form onSubmit={handleSaveCategory} className="flex flex-col gap-4">
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Nombre del Módulo</label>
                    <input
                      type="text"
                      value={categoryForm.name}
                      onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value.toUpperCase() })}
                      className="w-full p-3 border-4 border-[#1a1a1a] bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors"
                      placeholder="EJ: REPARACIONES PC"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Seleccionar Icono</label>
                    <div className="grid grid-cols-6 gap-2">
                      {ICON_OPTIONS.map((opt) => (
                        <button
                          key={opt.name}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, icon: opt.name })}
                          className={`p-2 border-2 transition-all ${categoryForm.icon === opt.name ? 'border-[#0055ff] bg-[#0055ff]/10 scale-110' : 'border-[#1a1a1a] bg-[#f5f0e8] opacity-50'}`}
                        >
                          <opt.icon className="w-5 h-5 mx-auto" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Color de Fondo</label>
                    <div className="grid grid-cols-3 gap-2">
                      {COLOR_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setCategoryForm({ ...categoryForm, color: opt.value })}
                          className={`p-2 border-2 text-[10px] font-black uppercase transition-all ${categoryForm.color === opt.value ? 'border-[#0055ff] ring-2 ring-[#0055ff] ring-offset-2' : 'border-[#1a1a1a] opacity-80'}`}
                        >
                          <div className={`w-full h-4 ${opt.value} mb-1 border border-black/20`}></div>
                          {opt.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="mt-4 w-full py-4 border-4 border-[#1a1a1a] bg-[#ff9900] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#ff9900] transition-colors shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
                  >
                    {editingCategory ? 'Guardar Cambios' : 'Crear Módulo'}
                  </button>
                </form>
              </div>
            </div>
          )}

          {/* Location Map Picker */}
          {isMapPickerOpen && (
            <LocationMapPicker
              isOpen={isMapPickerOpen}
              onClose={() => setIsMapPickerOpen(false)}
              onSelect={(lat, lng) => {
                setLocationForm({ ...locationForm, latitude: lat, longitude: lng });
                setIsMapPickerOpen(false);
              }}
              initialLat={locationForm.latitude}
              initialLng={locationForm.longitude}
            />
          )}
        </>
      )}
    </div>
  );
}
