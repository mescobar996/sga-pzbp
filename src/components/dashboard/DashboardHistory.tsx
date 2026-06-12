import React, { useState, useEffect } from 'react';
import { getConsolidatedHistory } from '../../db/historial';
import { Timeline } from '../Timeline';

export const DashboardHistory: React.FC<{ locationCode: string }> = ({ locationCode }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (locationCode) {
      setLoading(true);
      getConsolidatedHistory(locationCode).then(data => {
        setHistory(data);
        setLoading(false);
      });
    }
  }, [locationCode]);

  if (loading) return <div className="p-4 text-xs font-bold opacity-60">Cargando...</div>;

  return <Timeline items={history} />;
};
