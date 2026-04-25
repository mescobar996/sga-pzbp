import { useEffect, useState } from 'react';
import { supabase, getCurrentUserId, getCurrentUserEmail } from '../db/client';
import { useNavigate } from 'react-router-dom';

export default function DebugDB() {
  const navigate = useNavigate();
  const [results, setResults] = useState<any>({});
  const [dbInfo, setDbInfo] = useState<any>({});

  useEffect(() => {
    const run = async () => {
      const info: any = {
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'Not configured',
        currentUser: getCurrentUserEmail() || 'No logged in',
        currentUserUid: getCurrentUserId() || 'None',
      };
      setDbInfo(info);

      const cols = ['tasks', 'visitas', 'novedades', 'personal', 'locations', 'task_history', 'notifications', 'users'];
      const res: any = {};

      for (const col of cols) {
        try {
          const { data, error, count } = await supabase.from(col).select('*', { count: 'exact', head: true });
          if (error) throw error;
          res[col] = {
            status: 'OK',
            count: count || 0,
            sample: data && data[0] ? { id: (data[0] as any).id, fields: Object.keys(data[0]) } : null,
          };
        } catch (err: any) {
          res[col] = {
            status: 'ERROR',
            error: err.message || String(err),
          };
        }
      }

      setResults(res);
    };
    run();
  }, []);

  return (
    <div className="font-['Inter'] max-w-4xl mx-auto p-6 bg-white">
      <h1 className="text-2xl font-black uppercase mb-4">🔍 Debug Database</h1>

      <button onClick={() => navigate('/')} className="mb-4 px-4 py-2 bg-blue-600 text-white rounded">← Volver al Dashboard</button>

      <div className="mb-6 p-4 bg-gray-100 rounded">
        <h2 className="font-bold mb-2">Supabase Config</h2>
        <pre className="text-sm whitespace-pre-wrap">{JSON.stringify(dbInfo, null, 2)}</pre>
      </div>

      <div className="space-y-3">
        {Object.entries(results).map(([col, data]: [string, any]) => (
          <div key={col} className={`p-4 rounded border-2 ${data.status === 'OK' ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
            <div className="flex justify-between">
              <span className="font-bold">{col}</span>
              <span className={data.status === 'OK' ? 'text-green-600' : 'text-red-600'}>{data.status}</span>
            </div>
            {data.count !== undefined && <div className="text-sm">Rows: {data.count}</div>}
            {data.sample && <div className="text-xs mt-1">Sample ID: {data.sample.id} | Fields: {data.sample.fields.join(', ')}</div>}
            {data.error && <div className="text-sm text-red-600 mt-1">Error: {data.error}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
