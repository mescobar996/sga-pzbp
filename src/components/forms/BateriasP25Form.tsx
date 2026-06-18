import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save } from 'lucide-react';
import { FormField } from '../FormField';
import { getLocations } from '../../db/locations';
import { upsertRelevamientoBateriasP25 } from '../../db/planillas';
import type { Location } from '../../types';
import type { RelevamientoBateriasP25 } from '../../db/planillas';
import { toast } from 'sonner';

interface BateriasP25FormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  registro: RelevamientoBateriasP25 | null;
  authorName: string;
}

export default function BateriasP25Form({
  isOpen,
  onClose,
  onSaveSuccess,
  registro,
  authorName,
}: BateriasP25FormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [enFuncionamiento, setEnFuncionamiento] = useState(0);
  const [fueraDeServicio, setFueraDeServicio] = useState(0);
  const [observaciones, setObservaciones] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load locations on mount
  useEffect(() => {
    const fetchLocs = async () => {
      setLoadingLocations(true);
      try {
        const data = await getLocations();
        // Sort destinations first or alphabetical
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

  // Sync form state with selected registration (if editing)
  useEffect(() => {
    if (isOpen) {
      if (registro) {
        setLocationId(registro.location_id);
        setEnFuncionamiento(registro.en_funcionamiento);
        setFueraDeServicio(registro.fuera_de_servicio);
        setObservaciones(registro.observaciones || '');
      } else {
        setLocationId('');
        setEnFuncionamiento(0);
        setFueraDeServicio(0);
        setObservaciones('');
      }
      setErrors({});
    }
  }, [isOpen, registro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors: Record<string, string> = {};
    if (!locationId) {
      formErrors.locationId = 'LA UBICACIÓN ES OBLIGATORIA';
    }
    if (enFuncionamiento < 0) {
      formErrors.enFuncionamiento = 'DEBE SER MAYOR O IGUAL A 0';
    }
    if (fueraDeServicio < 0) {
      formErrors.fueraDeServicio = 'DEBE SER MAYOR O IGUAL A 0';
    }

    if (Object.keys(formErrors).length > 0) {
      setErrors(formErrors);
      toast.error('POR FAVOR, CORREGÍ LOS ERRORES DEL FORMULARIO');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find selected location details
      const selectedLoc = locations.find((l) => l.id === locationId);
      const sigla = selectedLoc?.code || selectedLoc?.name.substring(0, 10).toUpperCase() || 'N/A';

      const payload = {
        ...(registro?.id ? { id: registro.id } : {}),
        location_id: locationId,
        destinatario_sigla: sigla.toUpperCase(),
        en_funcionamiento: enFuncionamiento,
        fuera_de_servicio: fueraDeServicio,
        observaciones: observaciones.trim() || undefined,
        author_name: authorName.toUpperCase(),
      };

      await upsertRelevamientoBateriasP25(payload);
      toast.success('REGISTRO GUARDADO CON ÉXITO');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error in upsert:', err);
      toast.error(`ERROR AL GUARDAR EL REGISTRO: ${err.message || 'ERROR DESCONOCIDO'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm">
          {/* Backdrop click closes modal */}
          <div className="absolute inset-0 -z-10" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white border-l-4 border-black shadow-[-6px_0px_0px_0px_rgba(0,0,0,1)] w-full max-w-lg h-full flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-[#1a1a1a] text-white p-5 flex justify-between items-center border-b-4 border-black">
              <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] tracking-wider">
                {registro ? 'MODIFICAR RELEVAMIENTO' : 'NUEVO REGISTRO / ACTUALIZAR'}
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-[#e63b2e] hover:text-white transition-colors border-2 border-transparent hover:border-white text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 flex-1 flex flex-col justify-between">
              <div className="space-y-6">
                {/* Location selector */}
                <FormField label="UBICACIÓN / DESTINO" error={errors.locationId} required>
                  <select
                    value={locationId}
                    onChange={(e) => {
                      setLocationId(e.target.value);
                      if (errors.locationId) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.locationId;
                          return copy;
                        });
                      }
                    }}
                    disabled={!!registro || loadingLocations}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <option value="">SELECCIONAR UBICACIÓN...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name.toUpperCase()} {loc.code ? `(${loc.code.toUpperCase()})` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* En funcionamiento */}
                <FormField label="CANTIDAD EN FUNCIONAMIENTO" error={errors.enFuncionamiento} required>
                  <input
                    type="number"
                    min="0"
                    value={enFuncionamiento}
                    onChange={(e) => setEnFuncionamiento(parseInt(e.target.value) || 0)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                    placeholder="0"
                  />
                </FormField>

                {/* Fuera de servicio */}
                <FormField label="CANTIDAD FUERA DE SERVICIO" error={errors.fueraDeServicio} required>
                  <input
                    type="number"
                    min="0"
                    value={fueraDeServicio}
                    onChange={(e) => setFueraDeServicio(parseInt(e.target.value) || 0)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                    placeholder="0"
                  />
                </FormField>

                {/* Observaciones */}
                <FormField label="OBSERVACIONES">
                  <textarea
                    rows={4}
                    value={observaciones}
                    onChange={(e) => setObservaciones(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors resize-none text-sm"
                    placeholder="OBSERVACIONES ADICIONALES..."
                  />
                </FormField>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 border-t-4 border-black pt-6 mt-8">
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
                  className="w-1/2 px-6 py-3 border-2 border-black bg-[#00cc66] text-white font-black uppercase tracking-widest hover:bg-[#1a1a1a] hover:text-[#00cc66] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-none"
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
