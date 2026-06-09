import React, { useState, useEffect } from 'react';
import { getCategories } from '../../db/diligenciamientos';
import type { DiligenciamientoCategory } from '../../types';

interface Props {
  onFilterChange: (filters: { category?: string; fechaInicio?: string; fechaFin?: string }) => void;
}

export default function DiligenciamientoFilter({ onFilterChange }: Props) {
  const [categories, setCategories] = useState<DiligenciamientoCategory[]>([]);
  const [category, setCategory] = useState<string>('');
  const [fechaInicio, setFechaInicio] = useState<string>('');
  const [fechaFin, setFechaFin] = useState<string>('');

  useEffect(() => {
    getCategories().then(setCategories);
  }, []);

  const handleFilter = () => {
    onFilterChange({ 
      category: category || undefined, 
      fechaInicio: fechaInicio || undefined, 
      fechaFin: fechaFin || undefined 
    });
  };

  return (
    <div className="flex flex-wrap gap-4 p-4 bg-white border-2 border-[#1a1a1a] shadow-[4px_4px_0px_0px_rgba(26,26,26,1)] mb-6">
      <select 
        value={category} 
        onChange={(e) => setCategory(e.target.value)}
        className="p-2 border-2 border-[#1a1a1a] text-xs font-black uppercase"
      >
        <option value="">Todas las Categorías</option>
        {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
      </select>
      
      <input 
        type="date" 
        value={fechaInicio} 
        onChange={(e) => setFechaInicio(e.target.value)}
        className="p-2 border-2 border-[#1a1a1a] text-xs"
      />
      
      <input 
        type="date" 
        value={fechaFin} 
        onChange={(e) => setFechaFin(e.target.value)}
        className="p-2 border-2 border-[#1a1a1a] text-xs"
      />
      
      <button 
        onClick={handleFilter}
        className="px-4 py-2 bg-[#1a1a1a] text-white text-xs font-black uppercase hover:bg-[#0055ff] transition-colors"
      >
        Filtrar
      </button>
    </div>
  );
}
