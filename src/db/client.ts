import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[Supabase] Missing environment variables: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY. ' +
      'Copy .env.example to .env and configure your Supabase project.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
});

/**
 * Envoltorio para promesas que fallan automáticamente tras un tiempo determinado.
 */
export async function withTimeout<T>(promise: Promise<T> | PromiseLike<T>, timeoutMs: number = 8000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: La operación tardó más de ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// Synchronous user accessors (populated by auth state listener)
let _currentUserId: string | null = null;
let _currentUserEmail: string | null = null;
let _currentUserRole: string | null = null;

supabase.auth.onAuthStateChange(async (_event, session) => {
  _currentUserId = session?.user?.id || null;
  _currentUserEmail = session?.user?.email || null;

  if (_currentUserId) {
    // Load role in background without blocking or strict timeout
    // Fire and forget - role will be set whenever the query completes
    (async () => {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('role')
          .eq('id', _currentUserId)
          .single();
        if (data?.role) {
          _currentUserRole = data.role;
        } else {
          _currentUserRole = 'user';
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.warn('[Auth] Could not load role (falling back to user):', message);
        _currentUserRole = 'user';
      }
    })();
  } else {
    _currentUserRole = null;
  }
});

export function getCurrentUserId(): string {
  if (!_currentUserId) throw new Error('No authenticated user');
  return _currentUserId;
}

export function getCurrentUserEmail(): string {
  return _currentUserEmail || '';
}

export function getCurrentUserRole(): string {
  return _currentUserRole || 'user';
}

export function isAdmin(): boolean {
  return getCurrentUserRole() === 'admin' || getCurrentUserEmail() === 'matialeescobar96@gmail.com';
}
