import { Users, MapPin, Server, Edit, Trash2, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import * as XLSX from 'xlsx';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  console.error('Firestore Error: ', error);
  throw new Error(String(error));
}

export default function BaseDatos() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const collectionsToExport = ['tasks', 'visitas', 'novedades', 'task_history'];
      const workbook = XLSX.utils.book_new();

      for (const colName of collectionsToExport) {
        const querySnapshot = await getDocs(collection(db, colName));
        const data = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        if (data.length > 0) {
          const worksheet = XLSX.utils.json_to_sheet(data);
          XLSX.utils.book_append_sheet(workbook, worksheet, colName.toUpperCase());
        } else {
          // Empty sheet
          const worksheet = XLSX.utils.json_to_sheet([{ message: 'Sin datos' }]);
          XLSX.utils.book_append_sheet(workbook, worksheet, colName.toUpperCase());
        }
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

    setIsDeleting(true);
    try {
      const collectionsToDelete = ['tasks', 'visitas', 'novedades', 'task_history', 'notifications'];
      
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
  const personnel = [
    { id: 1, name: 'Juan Pérez', role: 'Técnico Senior', status: 'Activo' },
    { id: 2, name: 'María Gómez', role: 'Ingeniera de Redes', status: 'Activo' },
    { id: 3, name: 'Carlos López', role: 'Especialista IT', status: 'Inactivo' },
  ];

  const locations = [
    { id: 1, name: 'Sede Central', type: 'Origen/Destino', status: 'Operativo' },
    { id: 2, name: 'Zona Portuaria', type: 'Destino', status: 'Operativo' },
    { id: 3, name: 'Base Naval', type: 'Origen', status: 'Mantenimiento' },
  ];

  return (
    <div className="font-['Inter'] max-w-7xl mx-auto">
      <h1 className="text-5xl font-black uppercase mb-8 font-['Space_Grotesk'] tracking-tighter">Administración de Datos</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Personnel Table */}
        <div className="bg-white border-4 border-[#1a1a1a] p-8 shadow-[12px_12px_0px_0px_rgba(26,26,26,1)]">
          <div className="flex items-center justify-between mb-6 border-b-4 border-[#1a1a1a] pb-2">
            <h2 className="text-2xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
              <Users className="w-6 h-6" /> Personal
            </h2>
            <button 
              onClick={() => toast.info('Funcionalidad de añadir personal en desarrollo')}
              className="px-4 py-2 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            >
              Añadir
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-[#1a1a1a] bg-[#f5f0e8]">
                  <th className="p-4 font-black uppercase tracking-widest text-sm">Nombre</th>
                  <th className="p-4 font-black uppercase tracking-widest text-sm">Rol</th>
                  <th className="p-4 font-black uppercase tracking-widest text-sm">Estado</th>
                  <th className="p-4 font-black uppercase tracking-widest text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {personnel.map((person) => (
                  <tr key={person.id} className="border-b-2 border-[#1a1a1a] hover:bg-[#ffcc00] transition-colors group">
                    <td className="p-4 font-bold uppercase">{person.name}</td>
                    <td className="p-4 text-sm font-bold opacity-70 uppercase">{person.role}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-black uppercase border-2 border-[#1a1a1a] ${person.status === 'Activo' ? 'bg-[#00cc66] text-white' : 'bg-[#e63b2e] text-white'}`}>
                        {person.status}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toast.info(`Editando a ${person.name}`)}
                        className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toast.error(`Eliminando a ${person.name}`)}
                        className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#e63b2e] hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Locations Table */}
        <div className="bg-white border-4 border-[#1a1a1a] p-8 shadow-[12px_12px_0px_0px_rgba(26,26,26,1)]">
          <div className="flex items-center justify-between mb-6 border-b-4 border-[#1a1a1a] pb-2">
            <h2 className="text-2xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
              <MapPin className="w-6 h-6" /> Orígenes / Destinos
            </h2>
            <button 
              onClick={() => toast.info('Funcionalidad de añadir ubicación en desarrollo')}
              className="px-4 py-2 border-2 border-[#1a1a1a] bg-[#0055ff] text-white font-black uppercase text-xs tracking-widest hover:bg-[#1a1a1a] hover:text-[#0055ff] transition-colors shadow-[2px_2px_0px_0px_rgba(26,26,26,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none"
            >
              Añadir
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b-4 border-[#1a1a1a] bg-[#f5f0e8]">
                  <th className="p-4 font-black uppercase tracking-widest text-sm">Ubicación</th>
                  <th className="p-4 font-black uppercase tracking-widest text-sm">Tipo</th>
                  <th className="p-4 font-black uppercase tracking-widest text-sm">Estado</th>
                  <th className="p-4 font-black uppercase tracking-widest text-sm text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} className="border-b-2 border-[#1a1a1a] hover:bg-[#ffcc00] transition-colors group">
                    <td className="p-4 font-bold uppercase">{loc.name}</td>
                    <td className="p-4 text-sm font-bold opacity-70 uppercase">{loc.type}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 text-xs font-black uppercase border-2 border-[#1a1a1a] ${loc.status === 'Operativo' ? 'bg-[#00cc66] text-white' : 'bg-[#ffcc00] text-[#1a1a1a]'}`}>
                        {loc.status}
                      </span>
                    </td>
                    <td className="p-4 flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => toast.info(`Editando ubicación ${loc.name}`)}
                        className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#1a1a1a] hover:text-white transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => toast.error(`Eliminando ubicación ${loc.name}`)}
                        className="p-2 border-2 border-[#1a1a1a] bg-white hover:bg-[#e63b2e] hover:text-white transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Status & Actions */}
        <div className="lg:col-span-2 bg-[#1a1a1a] text-white border-4 border-[#1a1a1a] p-8 shadow-[12px_12px_0px_0px_rgba(255,204,0,1)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b-4 border-white pb-4">
            <h2 className="text-2xl font-black uppercase font-['Space_Grotesk'] flex items-center gap-2">
              <Server className="w-6 h-6" /> Estado y Mantenimiento
            </h2>
            <div className="flex gap-2">
              <button 
                onClick={handleExportExcel}
                disabled={isExporting}
                className="px-4 py-2 border-2 border-white bg-[#00cc66] text-[#1a1a1a] font-black uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <Download className="w-4 h-4" /> {isExporting ? 'Exportando...' : 'Exportar Excel'}
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
            <div className="p-6 border-4 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-2">Base de Datos</p>
              <p className="text-3xl font-black font-['Space_Grotesk'] flex items-center gap-2">
                <span className="w-4 h-4 bg-[#00cc66] rounded-full inline-block border-2 border-current"></span>
                EN LÍNEA
              </p>
            </div>
            <div className="p-6 border-4 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-2">Último Respaldo</p>
              <p className="text-3xl font-black font-['Space_Grotesk']">HOY 04:00</p>
            </div>
            <div className="p-6 border-4 border-white bg-[#1a1a1a] hover:bg-white hover:text-[#1a1a1a] transition-colors group cursor-pointer">
              <p className="text-xs font-bold uppercase tracking-widest opacity-60 group-hover:opacity-100 mb-2">Almacenamiento</p>
              <p className="text-3xl font-black font-['Space_Grotesk']">45% USO</p>
            </div>
          </div>

          {/* Danger Zone */}
          <div className="border-4 border-[#e63b2e] p-6 bg-[#1a1a1a] relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-10">
              <AlertTriangle className="w-32 h-32 text-[#e63b2e]" />
            </div>
            <h3 className="text-xl font-black uppercase text-[#e63b2e] mb-2 flex items-center gap-2 relative z-10">
              <AlertTriangle className="w-5 h-5" /> Zona de Peligro
            </h3>
            <p className="text-sm font-bold opacity-80 mb-4 relative z-10 max-w-2xl">
              El borrado masivo eliminará permanentemente todas las tareas, visitas, novedades y notificaciones. Esta acción no se puede deshacer. Por favor, exporta un respaldo antes de proceder.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <input 
                type="text" 
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Escribe CONFIRMAR"
                className="p-3 border-2 border-[#e63b2e] bg-[#1a1a1a] text-white focus:outline-none focus:bg-[#e63b2e]/10 font-bold uppercase w-full sm:w-64"
              />
              <button 
                onClick={handleMassDelete}
                disabled={isDeleting || deleteConfirmation !== 'CONFIRMAR'}
                className="px-6 py-3 bg-[#e63b2e] text-white font-black uppercase tracking-widest hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap"
              >
                <Trash2 className="w-4 h-4" /> {isDeleting ? 'Borrando...' : 'Borrado Masivo'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
