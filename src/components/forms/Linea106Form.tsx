import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save } from 'lucide-react';
import { FormField } from '../FormField';
import { getLocations } from '../../db/locations';
import { upsertRelevamientoLinea106 } from '../../db/relevamientos';
import type { Location } from '../../types';
import type { RelevamientoLinea106 } from '../../db/relevamientos';
import { toast } from 'sonner';

interface Linea106FormProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSuccess: () => void;
  registro: RelevamientoLinea106 | null;
  authorName: string;
}

export default function Linea106Form({
  isOpen,
  onClose,
  onSaveSuccess,
  registro,
  authorName,
}: Linea106FormProps) {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);

  const [locationId, setLocationId] = useState('');
  const [grabadoraAudio, setGrabadoraAudio] = useState('');
  const [vhfConectado, setVhfConectado] = useState('NO');
  const [grabacionVhf, setGrabacionVhf] = useState('NO');
  const [observacionesVhf, setObservacionesVhf] = useState('');
  const [telefonoAnalogico, setTelefonoAnalogico] = useState('NO');
  const [grabacion106, setGrabacion106] = useState('NO');
  const [adaptadorDivisor, setAdaptadorDivisor] = useState('NO');
  const [adaptadorMachoHembra, setAdaptadorMachoHembra] = useState('NO');
  const [observacionesLinea106, setObservacionesLinea106] = useState('');

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

  // Sync state with selected registration
  useEffect(() => {
    if (isOpen) {
      if (registro) {
        setLocationId(registro.location_id || '');
        setGrabadoraAudio(registro.grabadora_audio || '');
        setVhfConectado(registro.vhf_conectado || 'NO');
        setGrabacionVhf(registro.grabacion_vhf || 'NO');
        setObservacionesVhf(registro.observaciones_vhf || '');
        setTelefonoAnalogico(registro.telefono_analogico || 'NO');
        setGrabacion106(registro.grabacion_106 || 'NO');
        setAdaptadorDivisor(registro.adaptador_rj11_divisor || 'NO');
        setAdaptadorMachoHembra(registro.adaptador_rj11_macho_hembra || 'NO');
        setObservacionesLinea106(registro.observaciones_106 || '');
      } else {
        setLocationId('');
        setGrabadoraAudio('');
        setVhfConectado('NO');
        setGrabacionVhf('NO');
        setObservacionesVhf('');
        setTelefonoAnalogico('NO');
        setGrabacion106('NO');
        setAdaptadorDivisor('NO');
        setAdaptadorMachoHembra('NO');
        setObservacionesLinea106('');
      }
      setErrors({});
    }
  }, [isOpen, registro]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors: Record<string, string> = {};
    if (!locationId) {
      formErrors.locationId = 'EL DESTINO ES OBLIGATORIO';
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
        grabadora_audio: grabadoraAudio.trim() || null,
        vhf_conectado: vhfConectado,
        grabacion_vhf: grabacionVhf,
        observaciones_vhf: observacionesVhf.trim() || null,
        telefono_analogico: telefonoAnalogico,
        grabacion_106: grabacion106,
        adaptador_rj11_divisor: adaptadorDivisor,
        adaptador_rj11_macho_hembra: adaptadorMachoHembra,
        observaciones_106: observacionesLinea106.trim() || null,
        author_name: authorName.toUpperCase(),
      };

      await upsertRelevamientoLinea106(payload);
      toast.success('REGISTRO GUARDADO CON ÉXITO');
      onSaveSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error upserting Linea 106:', err);
      const errMsg = (err.message || 'ERROR DESCONOCIDO').toUpperCase();
      toast.error(`ERROR AL GUARDAR EL REGISTRO: ${errMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-center md:justify-end bg-black/40 backdrop-blur-sm">
          <div className="absolute inset-0 -z-10" onClick={onClose} />

          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-white border-4 md:border-0 md:border-l-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] md:shadow-[-6px_0px_0px_0px_rgba(0,0,0,1)] w-[95%] md:w-full max-w-2xl md:max-w-lg h-[95%] md:h-full my-auto md:my-0 flex flex-col overflow-y-auto"
          >
            {/* Header */}
            <div className="bg-[#1a1a1a] text-white p-5 flex justify-between items-center border-b-4 border-black shrink-0">
              <h2 className="text-xl font-black uppercase font-['Space_Grotesk'] tracking-wider">
                {registro ? 'MODIFICAR LÍNEA 106' : 'NUEVA LÍNEA 106 / GRABADORA'}
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
                <FormField label="UBICACIÓN / DESTINO" error={errors.locationId} required>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    disabled={loadingLocations}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer disabled:opacity-60"
                  >
                    <option value="">SELECCIONAR UBICACIÓN...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name.toUpperCase()} {loc.code ? `(${loc.code.toUpperCase()})` : ''}
                      </option>
                    ))}
                  </select>
                </FormField>

                {/* Grabadora de Audio */}
                <FormField label="GRABADORA DE AUDIO">
                  <input
                    type="text"
                    value={grabadoraAudio}
                    onChange={(e) => setGrabadoraAudio(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm"
                    placeholder="EJ. GRABADORA 8 CANALES"
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  {/* VHF Conectado */}
                  <FormField label="VHF CONECTADO">
                    <select
                      value={vhfConectado}
                      onChange={(e) => setVhfConectado(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </FormField>

                  {/* Grabación VHF */}
                  <FormField label="GRABACIÓN VHF">
                    <select
                      value={grabacionVhf}
                      onChange={(e) => setGrabacionVhf(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </FormField>
                </div>

                {/* Observaciones VHF */}
                <FormField label="OBSERVACIONES VHF">
                  <textarea
                    rows={2}
                    value={observacionesVhf}
                    onChange={(e) => setObservacionesVhf(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors resize-none text-sm"
                    placeholder="OBSERVACIONES PARTICULARES DE VHF..."
                  />
                </FormField>

                <div className="grid grid-cols-2 gap-4">
                  {/* Teléfono Analógico */}
                  <FormField label="TELÉFONO ANALÓGICO">
                    <select
                      value={telefonoAnalogico}
                      onChange={(e) => setTelefonoAnalogico(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </FormField>

                  {/* Grabación 106 */}
                  <FormField label="GRABACIÓN 106">
                    <select
                      value={grabacion106}
                      onChange={(e) => setGrabacion106(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </FormField>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Adaptador Divisor */}
                  <FormField label="ADAPTADOR DIVISOR">
                    <select
                      value={adaptadorDivisor}
                      onChange={(e) => setAdaptadorDivisor(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </FormField>

                  {/* Adaptador Macho/Hembra */}
                  <FormField label="ADAPTADOR MACHO/HEMBRA">
                    <select
                      value={adaptadorMachoHembra}
                      onChange={(e) => setAdaptadorMachoHembra(e.target.value)}
                      className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors text-sm cursor-pointer"
                    >
                      <option value="SI">SI</option>
                      <option value="NO">NO</option>
                    </select>
                  </FormField>
                </div>

                {/* Observaciones Línea 106 */}
                <FormField label="OBSERVACIONES LÍNEA 106">
                  <textarea
                    rows={2}
                    value={observacionesLinea106}
                    onChange={(e) => setObservacionesLinea106(e.target.value)}
                    className="w-full p-3 border-2 border-black bg-[#f5f0e8] focus:bg-white focus:outline-none font-bold uppercase transition-colors resize-none text-sm"
                    placeholder="OBSERVACIONES GENERALES LÍNEA 106..."
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
