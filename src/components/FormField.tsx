import React from 'react';

interface FormFieldProps {
  label: string;
  error?: string;
  required?: boolean;
  helpText?: string;
  children: React.ReactNode;
}

export function FormField({ label, error, required, helpText, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <div className="flex justify-between items-center">
        <label className="text-xs font-black uppercase tracking-widest text-[#1a1a1a] flex items-center gap-1">
          {label} {required && <span className="text-[#e63b2e]">*</span>}
        </label>
        {helpText && <span className="text-[10px] font-bold opacity-50 uppercase">{helpText}</span>}
      </div>
      
      {children}
      
      {error && (
        <span className="text-[11px] font-black uppercase tracking-wider text-[#e63b2e] mt-0.5 animate-pulse">
          ⚠️ {error}
        </span>
      )}
    </div>
  );
}
