import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmModal({
  isOpen,
  title = '¿Estás seguro?',
  message,
  onConfirm,
  onCancel,
  confirmLabel = 'Sí, Eliminar',
  cancelLabel = 'Cancelar'
}: ConfirmModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className="bg-[#1a1a1a] text-white border-2 border-red-500 shadow-[8px_8px_0px_0px_rgba(230,59,46,1)] p-0 w-full max-w-sm overflow-hidden"
          >
            <div className="p-4 bg-red-500/10 border-b-2 border-red-500/30 flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <h3 className="font-black uppercase tracking-widest text-lg text-red-500">{title}</h3>
                <p className="text-sm font-bold opacity-80 mt-1">{message}</p>
              </div>
            </div>
            
            <div className="p-4 bg-[#1a1a1a] flex gap-3">
              <button
                onClick={onCancel}
                className="flex-1 py-2.5 border-2 border-white text-white font-black uppercase text-xs hover:bg-white hover:text-[#1a1a1a] transition-colors"
              >
                {cancelLabel}
              </button>
              <button
                onClick={() => {
                  onConfirm();
                }}
                className="flex-1 py-2.5 border-2 border-red-500 bg-red-500 text-white font-black uppercase text-xs hover:bg-red-600 hover:border-red-600 transition-colors"
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
