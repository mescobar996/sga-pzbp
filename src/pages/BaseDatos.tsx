import { Users, MapPin, Server, Edit, Trash2, Download, AlertTriangle, Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { collection, getDocs, deleteDoc, doc, onSnapshot, addDoc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { reauthenticateWithPopup, GoogleAuthProvider } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { useOutletContext } from 'react-router-dom';
import { personalSchema, locationSchema } from '../utils/validation';
import type { Personal, Location } from '../types';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, _operationType: OperationType, _path: string | null) {
  console.error('Firestore Error: ', error);
  toast.error('Error al procesar la solicitud');
}

export default function BaseDatos() {
  const { isAdmin } = useOutletContext<{ isAdmin: boolean }>();
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  // Data states
  const [personnel, setPersonnel] = useState<Personal[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);

  // Modal states
  const [isPersonalModalOpen, setIsPersonalModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<Personal | null>(null);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  // Form states
  const [personalForm, setPersonalForm] = useState({ name: '', role: '', status: 'Activo' });
  const [locationForm, setLocationForm] = useState({ name: '', type: 'Origen', status: 'Operativo' });

  // Filter states
  const [personalFilter, setPersonalFilter] = useState('Todos');
  const [locationFilter, setLocationFilter] = useState('Todos');

  useEffect(() => {
    // Fetch Personnel
    const qPersonal = query(collection(db, 'personal'), orderBy('name'));
    const unsubPersonal = onSnapshot(qPersonal, (snapshot) => {
      const data: Personal[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Personal));
      setPersonnel(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'personal'));

    // Fetch Locations
    const qLocations = query(collection(db, 'locations'), orderBy('name'));
    const unsubLocations = onSnapshot(qLocations, (snapshot) => {
      const data: Location[] = [];
      snapshot.forEach((doc) => data.push({ id: doc.id, ...doc.data() } as Location));
      setLocations(data);
    }, (error) => handleFirestoreError(error, OperationType.GET, 'locations'));

    return () => {
      unsubPersonal();
      unsubLocations();
    };
  }, []);

  const handleSavePersonal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const result = personalSchema.safeParse(personalForm);
    if (!result.success) {
      result.error.issues.forEach(err => toast.error(err.message));
      return;
    }

    try {
      if (editingPersonal) {
        await updateDoc(doc(db, 'personal', editingPersonal.id), {
          name: result.data.name,
          role: result.data.role,
          status: result.data.status
        });
        toast.success('Personal actualizado');
      } else {
        await addDoc(collection(db, 'personal'), {
          ...result.data,
          createdAt: new Date().toISOString(),
          authorId: auth.currentUser.uid
        });
        toast.success('Personal añadido');
      }
      setIsPersonalModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingPersonal ? OperationType.UPDATE : OperationType.CREATE, 'personal');
    }
  };

  const handleDeletePersonal = async (id: string) => {
    if (!window.confirm('¿Eliminar este registro de personal?')) return;
    try {
      await deleteDoc(doc(db, 'personal', id));
      toast.success('Personal eliminado');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'personal');
    }
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    const result = locationSchema.safeParse(locationForm);
    if (!result.success) {
      result.error.issues.forEach(err => toast.error(err.message));
      return;
    }

    try {
      if (editingLocation) {
        await updateDoc(doc(db, 'locations', editingLocation.id), {
          name: result.data.name,
          type: result.data.type,
          status: result.data.status
        });
        toast.success('Ubicación actualizada');
      } else {
        await addDoc(collection(db, 'locations'), {
          ...result.data,
          createdAt: new Date().toISOString(),
          authorId: auth.currentUser.uid
        });
        toast.success('Ubicación añadida');
      }
      setIsLocationModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingLocation ? OperationType.UPDATE : OperationType.CREATE, 'locations');
    }
  };

  const handleDeleteLocation = async (id: string) => {
    if (!window.confirm('¿Eliminar esta ubicación?')) return;
    try {
      await deleteDoc(doc(db, 'locations', id));
      toast.success('Ubicación eliminada');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'locations');
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const collectionsToExport = ['tasks', 'visitas', 'novedades', 'task_history'];
      const workbook = XLSX.utils.book_new();

      const sheetConfigurations: Record<string, { title: string; columns: { key: string; header: string; width: number }[] }> = {
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
        const querySnapshot = await getDocs(collection(db, colName));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const config = sheetConfigurations[colName];

        const worksheetData: any[] = [];

        // Title and metadata
        worksheetData.push({ A: config?.title || colName.toUpperCase() });
        worksheetData.push({ A: `Respaldo generado: ${new Date().toLocaleString('es-ES')}` });
        worksheetData.push({ A: `Total de registros: ${data.length}` });
        worksheetData.push({}); // spacer

        if (data.length > 0 && config) {
          // Header row
          const headerRow: Record<string, string> = {};
          config.columns.forEach((col, idx) => {
            headerRow[String.fromCharCode(65 + idx)] = col.header;
          });
          worksheetData.push(headerRow);

          // Data rows
          data.forEach((record) => {
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
                } catch { /* fall through */ }
              }
              row[cellRef] = String(val).slice(0, 100);
            });
            worksheetData.push(row);
          });
        } else if (data.length > 0) {
          // Fallback: export all columns
          worksheetData.push({ A: 'Datos exportados (formato estándar)' });
          data.forEach((record, idx) => {
            worksheetData.push({ A: `Registro ${idx + 1}`, B: JSON.stringify(record).slice(0, 100) });
          });
        } else {
          worksheetData.push({ A: 'Sin datos disponibles' });
        }

        const worksheet = XLSX.utils.json_to_sheet(worksheetData, { skipHeader: true });

        // Set column widths
        if (config) {
          const wscols = config.columns.map(col => ({ wch: col.width }));
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

  const handleMassDelete = async () => {
    if (deleteConfirmation !== 'CONFIRMAR') {
      toast.error('Debes escribir CONFIRMAR para proceder');
      return;
    }

    if (!auth.currentUser) {
      toast.error('Debes iniciar sesión');
      return;
    }

    try {
      await reauthenticateWithPopup(auth.currentUser, new GoogleAuthProvider());
    } catch (error) {
      toast.error('Reautenticación cancelada o fallida');
      return;
    }

    setIsDeleting(true);
    try {
      const collectionsToBackup = ['tasks', 'visitas', 'novedades', 'task_history', 'personal', 'locations', 'notifications'];
      const backupData: Record<string, unknown[]> = {};

      for (const colName of collectionsToBackup) {
        const querySnapshot = await getDocs(collection(db, colName));
        backupData[colName] = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

      const collectionsToDelete = ['tasks', 'visitas', 'novedades', 'task_history', 'notifications', 'personal', 'locations'];

      for (const colName of collectionsToDelete) {
        const querySnapshot = await getDocs(collection(db, colName));
        const deletePromises = querySnapshot.docs.map(document =>
          deleteDoc(doc(db, colName, document.id))
        );
        await Promise.all(deletePromises);
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
      <h1 className="text-4xl font-black uppercase mb-6 font-['Space_Grotesk'] tracking-tighter">Administración de Datos</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Personnel Table */}
        <div className="bg-white border-2 border-[#1a1a1a] p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#1a1a1a] pb-2">
            <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
              <Users className="w-5 h-5" /> Personal
            </h2>
            <div className="flex gap-2 items-center">
              <select 
                value={personalFilter}
                onChange={(e) => setPersonalFilter(e.target.value)}
                className="text-xs font-bold uppercase border-2 border-[#1a1a1a] p-1 bg-[#f5f0e8] focus:outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>
              <button 
                onClick={() => {
                  setEditingPersonal(null);
                  setPersonalForm({ name: '', role: '', status: 'Activo' });
                  setIsPersonalModalOpen(true);
                }}
                className="px-3 py-1.5 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                Añadir
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#1a1a1a] bg-[#f5f0e8]">
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Nombre</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Rol</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Estado</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personnel.filter(p => personalFilter === 'Todos' || p.status === personalFilter).map((person) => (
                  <tr key={person.id} className="border-b border-[#1a1a1a]/20 hover:bg-[#0055ff] hover:text-white transition-colors group">
                    <td className="p-3 font-bold uppercase text-sm truncate max-w-[120px]" title={person.name}>{person.name}</td>
                    <td className="p-3 text-xs font-bold opacity-70 uppercase">{person.role}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-[#1a1a1a] ${person.status === 'Activo' ? 'bg-[#00cc66] text-white' : 'bg-[#e63b2e] text-white'}`}>
                        {person.status}
                      </span>
                    </td>
                    <td className="p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingPersonal(person);
                          setPersonalForm({ name: person.name, role: person.role, status: person.status });
                          setIsPersonalModalOpen(true);
                        }}
                        className="p-1.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#0055ff] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeletePersonal(person.id)}
                          className="p-1.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white border-2 border-[#1a1a1a] p-6 shadow-[8px_8px_0px_0px_rgba(26,26,26,1)] flex flex-col h-full">
          <div className="flex items-center justify-between mb-4 border-b-2 border-[#1a1a1a] pb-2">
            <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
              <MapPin className="w-5 h-5" /> Orígenes / Destinos
            </h2>
            <div className="flex gap-2 items-center">
              <select 
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="text-xs font-bold uppercase border-2 border-[#1a1a1a] p-1 bg-[#f5f0e8] focus:outline-none"
              >
                <option value="Todos">Todos</option>
                <option value="Operativo">Operativo</option>
                <option value="Mantenimiento">Mantenimiento</option>
                <option value="Inactivo">Inactivo</option>
              </select>
              <button 
                onClick={() => {
                  setEditingLocation(null);
                  setLocationForm({ name: '', type: 'Origen', status: 'Operativo' });
                  setIsLocationModalOpen(true);
                }}
                className="px-3 py-1.5 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                Añadir
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-2 border-[#1a1a1a] bg-[#f5f0e8]">
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Ubicación</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Tipo</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs">Estado</th>
                  <th className="p-3 font-black uppercase tracking-widest text-xs text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {locations.filter(l => locationFilter === 'Todos' || l.status === locationFilter).map((loc) => (
                  <tr key={loc.id} className="border-b border-[#1a1a1a]/20 hover:bg-[#0055ff] hover:text-white transition-colors group">
                    <td className="p-3 font-bold uppercase text-sm truncate max-w-[120px]" title={loc.name}>{loc.name}</td>
                    <td className="p-3 text-xs font-bold opacity-70 uppercase">{loc.type}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase border-2 border-[#1a1a1a] ${loc.status === 'Operativo' ? 'bg-[#00cc66] text-white' : loc.status === 'Mantenimiento' ? 'bg-[#0055ff] text-white' : 'bg-[#e63b2e] text-white'}`}>
                        {loc.status}
                      </span>
                    </td>
                    <td className="p-3 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => {
                          setEditingLocation(loc);
                          setLocationForm({ name: loc.name, type: loc.type, status: loc.status });
                          setIsLocationModalOpen(true);
                        }}
                        className="p-1.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#0055ff] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                        title="Editar"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                      {isAdmin && (
                        <button 
                          onClick={() => handleDeleteLocation(loc.id)}
                          className="p-1.5 border-2 border-[#1a1a1a] bg-white text-[#1a1a1a] hover:bg-[#e63b2e] hover:text-white transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
                          title="Eliminar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status & Actions */}
        <div className="lg:col-span-2 bg-[#1a1a1a] text-white border-2 border-[#1a1a1a] p-6 shadow-[8px_8px_0px_0px_rgba(0,85,255,1)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 border-b-2 border-white pb-3">
            <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
              <Server className="w-5 h-5" /> Estado y Mantenimiento
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-3 py-1.5 border-2 border-white bg-[#00cc66] text-[#1a1a1a] font-black uppercase text-xs tracking-widest hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50 shadow-[2px_2px_0px_0px_rgba(255,255,255,1)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none"
              >
                <Download className="w-3.5 h-3.5" /> {isExporting ? 'Exportando...' : 'Exportar Excel'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="p-4 border-2 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">Base de Datos</p>
              <p className="text-2xl font-black font-['Space_Grotesk'] flex items-center gap-2">
                <span className="w-3 h-3 bg-[#00cc66] rounded-full inline-block border-2 border-current"></span>
                EN LÍNEA
              </p>
            </div>
            <div className="p-4 border-2 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">Último Respaldo</p>
              <p className="text-2xl font-black font-['Space_Grotesk']">HOY 04:00</p>
            </div>
            <div className="p-4 border-2 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-1">Almacenamiento</p>
              <p className="text-2xl font-black font-['Space_Grotesk']">45% USO</p>
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
                El borrado masivo eliminará permanentemente todas las tareas, visitas, novedades y notificaciones. Esta acción no se puede deshacer. Por favor, exporta un respaldo antes de proceder.
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
              <button onClick={() => setIsPersonalModalOpen(false)} className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]">
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
              <button onClick={() => setIsLocationModalOpen(false)} className="p-1 hover:bg-[#1a1a1a] hover:text-white transition-colors border-2 border-transparent hover:border-[#1a1a1a]">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleSaveLocation} className="flex flex-col gap-4">
              <div>
                <label className="block text-sm font-bold uppercase tracking-widest opacity-70 mb-2">Nombre de Ubicación</label>
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
    </div>
  );
}
