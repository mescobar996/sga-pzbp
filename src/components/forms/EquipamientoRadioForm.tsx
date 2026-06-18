import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save } from 'lucide-react';
import { FormField } from '../FormField';
import { getLocations } from '../../db/locations';
import { upsertRelevamientoEquipamientoRadioelectrico } from '../../db/relevamientos';
import type { Location } from '../../types';
import type { RelevamientoEquipamientoRadioelectrico } from '../../db/relevamientos';
import { toast } from 'sonner';

interface EquipamientoRadioFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  registro: RelevamientoEquipamientoRadioelectrico | null;
  authorName: string;
}

export default function EquipamientoRadioForm({
  isOpen,
  onClose,
  onSaveSuccess,
  registro,
  authorName,
}: EquipamientoRadioFormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [ubicacionInterna, setUbicacionInterna] = useState('');
  const [idP25, setIdP25] = useState('');
  const [idGebipa, setIdGebipa] = useState('');
  const [inventarioGebipa, setInventarioGebipa] = useState('');
  const [nroSerie, setNroSerie] = useState('');
  const [modelo, setModelo] = useState('');
  const [caracteristica, setCaracteristica] = useState('');
  const [accesorios, setAccesorios] = useState('');
  const [estado, setEstado] = useState('OPERATIVO');
  const [observaciones, setObservaciones] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch locations
  useEffect(() => {
    const fetchLocs = async () => {
      setLoadingLocations(true);
      try {
        const data = await getLocations();
        setLocations(data);
      } catch (err) {
        console.error('Error fetching locations:', err);
        toast.error('ERROR AL CARGAR LAS UBICACIONES');
      } finally {
        setLoadingLocations(false);
      }
    };

    if (isOpen) {
      fetchLocs();
    }
  }, [isOpen]);

  // Sync state
  useEffect(() => {
    if (isOpen) {
      if (registro) {
        setLocationId(registro.location_id || '');
        setUbicacionInterna(registro.ubicacion_interna || '');
        setIdP25(registro.id_p25 || '');
        setIdGebipa(registro.id_gebipa || '');
        setInventarioGebipa(registro.inventario_gebipa || '');
        setNroSerie(registro.nro_serie || '');
        setModelo(registro.modelo || '');
        setCaracteristica(registro.caracteristica_equipo || '');
        setAccesorios(registro.accesorios || '');
        setEstado(registro.estado || 'OPERATIVO');
        setObservaciones(registro.observaciones || '');
      } else {
        setLocationId('');
        setUbicacionInterna('');
        setIdP25('');
        setIdGebipa('');
        setInventarioGebipa('');
        setNroSerie('');
        setModelo('');
        setCaracteristica('');
        setAccesorios('');
        setEstado('OPERATIVO');
        setObservaciones('');
      }
      setErrors({});
    }
  }, [isOpen, registro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors: Record<string, string> = {};
    if (!nroSerie.trim()) {
      formErrors.nroSerie = 'EL NÚMERO DE SERIE ES OBLIGATORIO';
    }
    if (!modelo.trim()) {
      formErrors.modelo = 'EL MODELO ES OBLIGATORIO';
    }
    if (!estado.trim()) {
      formErrors.estado = 'EL ESTADO ES OBLIGATORIO';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('POR FAVOR, CORREGÍ LOS ERRORES DEL FORMULARIO');
      return;
    }

    setIsSubmitting(true);
    try {
      const selectedLoc = locations.find((l) => l.id === locationId);
      const sigla = selectedLoc?.code || selectedLoc?.name.substring(0, 10).toUpperCase() || 'N/A';

      const payload = {
        ...(registro?.id ? { id: registro.id } : {}),
        location_id: locationId || null,
        destinatario_sigla: sigla.toUpperCase(),
        ubicacion_interna: ubicacionInterna.trim() || null,
        id_p25: idP25.trim() || null,
        id_gebipa: idGebipa.trim() || null,
        inventario_gebipa: inventarioGebipa.trim() || null,
        nro_serie: nroSerie.trim(),
        modelo: modelo.trim(),
        caracteristica_equipo: caracteristica.trim() || null,
        accesorios: accesorios.trim() || null,
        estado: estado.toUpperCase(),
        observaciones: observaciones.trim() || null,
        author_name: authorName.toUpperCase(),
      };

      await upsertRelevamientoEquipamientoRadioelectrico(payload);
      toast.success('REGISTRO GUARDADO CON ÉXITO');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error upserting equipment:', err);
      const errMsg = (err.message || 'ERROR DESCONOCIDO').toUpperCase();
      toast.error(`ERROR AL GUARDAR EL REGISTRO: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0 -z-10" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white border-l-4 border-black shadow-[-6px_0px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg h-full flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-[#1a1a1a] text-white p-5 flex justify-between items-center border-b-4 border-black shrink-0">
              <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] tracking-wider">
                {registro ? 'MODIFICAR EQUIPO' : 'NUEVO EQUIPO RADIOELÉCTRICO'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                {/* Destino */}
                <FormField label="UBICACIÓN / DESTINO">
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    disabled={loadingLocations}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer disabled:opacity-60"
                  >
                    <option value="">SELECCIONAR UBICACIÓN (OPCIONAL)...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name.toUpperCase()} {loc.code ? `(${loc.code.toUpperCase()})` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Ubicacion Interna */}
                <FormField label="UBICACIÓN INTERNA">
                  <input
                    type="text"
                    value={ubicacionInterna}
                    onChange={(e) => setUbicacionInterna(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                    placeholder="PISO, OFICINA, RACK, ETC."
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  {/* Modelo */}
                  <FormField label="MODELO" error={errors.modelo} required>
                    <input
                      type="text"
                      value={modelo}
                      onChange={(e) => setModelo(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                      placeholder="EJ. APX 2000"
                    />
                  </FormField>

                  {/* Nro Serie */}
                  <FormField label="N° DE SERIE" error={errors.nroSerie} required>
                    <input
                      type="text"
                      value={nroSerie}
                      onChange={(e) => setNroSerie(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                      placeholder="N/S DEL EQUIPO"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* ID P25 */}
                  <FormField label="ID P25">
                    <input
                      type="text"
                      value={idP25}
                      onChange={(e) => setIdP25(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                      placeholder="ID RED P25"
                    />
                  </FormField>

                  {/* ID GEBIPA */}
                  <FormField label="ID GEBIPA">
                    <input
                      type="text"
                      value={idGebipa}
                      onChange={(e) => setIdGebipa(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                      placeholder="ID GEBIPA"
                    />
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Inventario GEBIPA */}
                  <FormField label="INVENTARIO GEBIPA">
                    <input
                      type="text"
                      value={inventarioGebipa}
                      onChange={(e) => setInventarioGebipa(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                      placeholder="N° INVENTARIO"
                    />
                  </FormField>

                  {/* Característica */}
                  <FormField label="CARACTERÍSTICA">
                    <input
                      type="text"
                      value={caracteristica}
                      onChange={(e) => setCaracteristica(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                      placeholder="EJ. PORTÁTIL, MÓVIL"
                    />
                  </FormField>
                </div>

                {/* Estado */}
                <FormField label="ESTADO DEL EQUIPO" error={errors.estado} required>
                  <select
                    value={estado}
                    onChange={(e) => setEstado(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                  >
                    <option value="OPERATIVO">OPERATIVO</option>
                    <option value="MANTENIMIENTO">MANTENIMIENTO</option>
                    <option value="FUERA DE SERVICIO">FUERA DE SERVICIO</option>
                    <option value="INACTIVO">INACTIVO</option>
                  </select>
                </FormField>

                {/* Accesorios */}
                <FormField label="ACCESORIOS">
                  <textarea
                    rows={2}
                    value={accesorios}
                    onChange={(e) => setAccesorios(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors resize-none text-sm"
                    placeholder="EJ. CARGADOR, ANTENA, BATERÍA..."
                  />
                </FormField>

                {/* Observaciones */}
                <FormField label="OBSERVACIONES">
                  <textarea
                    rows={2}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors resize-none text-sm"
                    placeholder="OBSERVACIONES ADICIONALES..."
                  />
                </FormField>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t-4 border-black pt-6 shrink-0">
                <button
                  type="button"
                  onClick={onClose}
                  className="w-1/2 px-6 py-3 border-2 border-black bg-white text-black font-black uppercase tracking-widest hover:bg-[#e63b2e] hover:text-white transition-colors flex items-center justify-center gap-2 text-sm cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 px-6 py-3 border-2 border-black bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-black hover:text-[#00cc66] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      GUARDANDO...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" /> GUARDAR
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
