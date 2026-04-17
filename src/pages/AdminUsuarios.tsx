import React, { useState, useEffect } from 'react';
import { Shield, User, Users, Check, X, Loader2, AlertTriangle } from 'lucide-react';
import { FilterBar } from '../components/FilterBar';
import { supabase, getCurrentUserEmail } from '../db/client';
import { toast } from 'sonner';
import { motion } from 'motion/react';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  photo_url: string;
  created_at: string;
  last_sign_in_at: string;
}

export default function AdminUsuarios() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get sign-in info from auth.users via a separate call
      const { data: authData } = await supabase.auth.admin?.listUsers?.() ?? { data: { users: [] } };

      const mapped: UserRecord[] = (data || []).map((row: any) => ({
        id: row.id,
        name: row.name || row.email?.split('@')[0] || 'Sin nombre',
        email: row.email,
        role: row.role || 'user',
        photo_url: row.photo_url,
        created_at: row.created_at,
        last_sign_in_at: authData?.users?.find((u: any) => u.id === row.id)?.last_sign_in_at || row.created_at,
      }));

      setUsers(mapped);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'user' : 'admin';
    setSaving(userId);
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      setUsers(prev =>
        prev.map(u => u.id === userId ? { ...u, role: newRole } : u)
      );

      const user = users.find(u => u.id === userId);
      toast.success(
        `${user?.name || user?.email} ahora es ${newRole === 'admin' ? 'Administrador' : 'Usuario'}`
      );
    } catch (err) {
      console.error('Error updating role:', err);
      toast.error('Error al cambiar rol');
    } finally {
      setSaving(null);
    }
  };

  const filteredUsers = users.filter(u => {
    const term = search.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term)
    );
  });

  const adminCount = users.filter(u => u.role === 'admin').length;
  const userCount = users.filter(u => u.role === 'user').length;

  return (
    <div className="font-['Inter'] max-w-6xl mx-auto px-3 sm:px-4 pb-24 lg:pb-8">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-3 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white">
              <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
            </div>
            <div>
              <h1 className="text-xl sm:text-3xl lg:text-4xl font-black uppercase font-['Space_Grotesk'] tracking-tighter">
                Administración de Usuarios
              </h1>
              <p className="text-[11px] sm:text-sm font-bold opacity-50 uppercase mt-1">
                Gestiona los roles y permisos del equipo
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 mt-4 sm:mt-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-[#1a1a1a] text-white"
          >
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-[#0055ff]" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Admins</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk'] mt-1">{adminCount}</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-3 sm:p-4 border-2 border-[#1a1a1a] bg-white"
          >
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#00cc66]" />
              <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest opacity-60">Usuarios</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black font-['Space_Grotesk'] mt-1">{userCount}</p>
          </motion.div>
        </div>
      </div>

      <FilterBar
        search={{
          value: search,
          onChange: setSearch,
          placeholder: 'BUSCAR USUARIO...'
        }}
      />

      {/* Users List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-20 border-2 border-[#1a1a1a] bg-white animate-pulse" />
          ))}
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="text-center py-12 border-2 border-[#1a1a1a] bg-white">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-xs font-bold uppercase tracking-widest opacity-50">
            No se encontraron usuarios
          </p>
        </div>
      ) : (
        <div className="space-y-2 sm:space-y-3">
          {filteredUsers.map((user, idx) => {
            const isCurrentUserAdmin = user.email === getCurrentUserEmail();
            const isAdmin = user.role === 'admin';

            return (
              <motion.div
                key={user.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className="border-2 border-[#1a1a1a] bg-white p-3 sm:p-4 shadow-[3px_3px_0px_0px_rgba(26,26,26,0.3)] hover:shadow-[6px_6px_0px_0px_rgba(26,26,26,0.3)] transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  {/* User Info */}
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    {user.photo_url ? (
                      <img
                        src={user.photo_url}
                        alt={user.name}
                        className="w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#1a1a1a] object-cover shrink-0"
                      />
                    ) : (
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center shrink-0 ${isAdmin ? 'bg-[#1a1a1a] text-white' : 'bg-[#f5f0e8] text-[#1a1a1a]'}`}>
                        <User className="w-5 h-5 sm:w-6 sm:h-6" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-black text-sm sm:text-base uppercase truncate font-['Space_Grotesk']">
                          {user.name}
                        </p>
                        {isCurrentUserAdmin && (
                          <span className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-[#0055ff] text-white px-2 py-0.5 shrink-0">
                            Tú
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] sm:text-xs font-bold opacity-50 truncate">{user.email}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[9px] sm:text-[10px] font-bold opacity-40 uppercase">
                          Registrado: {new Date(user.created_at).toLocaleDateString('es-ES')}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Role Badge + Toggle */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Role Badge */}
                    <div
                      className={`px-3 py-1.5 border-2 border-[#1a1a1a] text-[10px] sm:text-xs font-black uppercase tracking-wider ${
                        isAdmin
                          ? 'bg-[#1a1a1a] text-white'
                          : 'bg-[#f5f0e8] text-[#1a1a1a]'
                      }`}
                    >
                      {isAdmin ? (
                        <span className="flex items-center gap-1.5">
                          <Shield className="w-3 h-3" /> Admin
                        </span>
                      ) : (
                        <span className="flex items-center gap-1.5">
                          <AlertTriangle className="w-3 h-3" /> Solo Lectura
                        </span>
                      )}
                    </div>

                    {/* Toggle Button */}
                    <button
                      onClick={() => toggleRole(user.id, user.role)}
                      disabled={saving === user.id || isCurrentUserAdmin}
                      className={`min-h-[44px] min-w-[44px] px-3 py-2 border-2 border-[#1a1a1a] text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all duration-150 flex items-center gap-1.5 ${
                        saving === user.id
                          ? 'opacity-50 cursor-not-allowed bg-gray-100'
                          : isCurrentUserAdmin
                            ? 'opacity-30 cursor-not-allowed bg-gray-100'
                            : isAdmin
                              ? 'bg-[#e63b2e] text-white hover:bg-[#c42f23]'
                              : 'bg-[#00cc66] text-white hover:bg-[#00b359]'
                      }`}
                    >
                      {saving === user.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : isAdmin ? (
                        <>
                          <X className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Quitar</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Promover</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
