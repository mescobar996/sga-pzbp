import React, { useState, useRef } from 'react';
import { Upload, Paperclip, X, Image as ImageIcon, Video, FileText, FileSpreadsheet } from 'lucide-react';

interface Attachment {
  name: string;
  url: string;
  type: string;
}

interface DragDropUploadProps {
  existingAttachments: Attachment[];
  pendingFiles: File[];
  onAddFiles: (files: File[]) => void;
  onRemovePending: (index: number) => void;
  onDeleteExisting: (attachment: Attachment) => void;
  isUploading?: boolean;
}

export function DragDropUpload({
  existingAttachments,
  pendingFiles,
  onAddFiles,
  onRemovePending,
  onDeleteExisting,
  isUploading = false,
}: DragDropUploadProps) {
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getFileIcon = (type: string, className: string = 'w-4 h-4') => {
    if (type.startsWith('image/')) return <ImageIcon className={className} />;
    if (type.startsWith('video/')) return <Video className={className} />;
    if (type === 'application/pdf') return <FileText className={className} />;
    if (type.includes('spreadsheet') || type.includes('excel') || type.includes('csv'))
      return <FileSpreadsheet className={className} />;
    return <Paperclip className={className} />;
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onAddFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onAddFiles(Array.from(e.target.files));
    }
    // reset target value so the same file can be selected again
    e.target.value = '';
  };

  const triggerFileInput = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Drop Zone Box */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={triggerFileInput}
        className={`border-2 border-dashed border-[#1a1a1a] p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-3 select-none ${
          isDragActive ? 'bg-[#0055ff]/10 border-[#0055ff]' : 'bg-white hover:bg-[#f5f0e8]'
        } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          disabled={isUploading}
          onChange={handleFileInputChange}
        />
        <div className="w-12 h-12 border-2 border-[#1a1a1a] bg-[#f5f0e8] flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]">
          <Upload className="w-6 h-6 text-[#1a1a1a]" />
        </div>
        <div>
          <p className="text-xs sm:text-sm font-black uppercase tracking-widest text-[#1a1a1a] mb-1">
            ARRAS-TRA Y SOLTÁ TUS ARCHIVOS
          </p>
          <p className="text-[10px] font-bold text-gray-500 uppercase">
            O HACÉ CLIC PARA BUSCAR EN TU DISPOSITIVO
          </p>
        </div>
      </div>

      {/* Files List Display */}
      {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
        <div className="flex flex-col gap-2">
          {/* Existing uploaded files */}
          {existingAttachments.map((att, idx) => (
            <div
              key={`existing-${idx}`}
              className="flex items-center justify-between p-2.5 border-2 border-[#1a1a1a] bg-[#f5f0e8] shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
            >
              <div className="flex items-center gap-2.5 truncate max-w-[80%]">
                {att.type.startsWith('image/') ? (
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-[#1a1a1a] overflow-hidden bg-white">
                    <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-8 h-8 flex-shrink-0 border-2 border-[#1a1a1a] bg-white flex items-center justify-center text-[#1a1a1a]">
                    {getFileIcon(att.type, 'w-4 h-4')}
                  </div>
                )}
                <a
                  href={att.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs sm:text-sm font-bold text-[#1a1a1a] hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {att.name}
                </a>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteExisting(att);
                }}
                className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#e63b2e] hover:text-white transition-colors"
                title="Eliminar archivo"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}

          {/* Pending files */}
          {pendingFiles.map((file, idx) => (
            <div
              key={`pending-${idx}`}
              className="flex items-center justify-between p-2.5 border-2 border-[#1a1a1a] bg-yellow-50 shadow-[2px_2px_0px_0px_rgba(26,26,26,1)]"
            >
              <div className="flex items-center gap-2.5 truncate max-w-[80%] opacity-85">
                <div className="w-8 h-8 flex-shrink-0 border-2 border-[#1a1a1a] bg-white flex items-center justify-center text-[#1a1a1a]">
                  {getFileIcon(file.type, 'w-4 h-4')}
                </div>
                <div className="flex flex-col truncate">
                  <span className="truncate text-xs sm:text-sm font-bold text-[#1a1a1a]">
                    {file.name}
                  </span>
                  <span className="text-[9px] font-black text-amber-600 uppercase tracking-wider">
                    PENDIENTE DE SUBIDA
                  </span>
                </div>
              </div>
              <button
                type="button"
                disabled={isUploading}
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePending(idx);
                }}
                className="w-8 h-8 flex items-center justify-center border-2 border-[#1a1a1a] bg-white hover:bg-[#e63b2e] hover:text-white transition-colors"
                title="Quitar de la lista"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
