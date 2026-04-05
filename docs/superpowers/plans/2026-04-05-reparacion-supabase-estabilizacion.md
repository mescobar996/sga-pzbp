# Reparación de Skeleton Infinito y Estabilización Supabase Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminar el estado de carga infinita (skeleton) y estabilizar la conexión con Supabase asegurando consistencia en el esquema de datos.

**Architecture:** Cambio de importaciones dinámicas a estáticas para eliminar bloqueos de `Suspense`, implementación de timeouts en la capa de datos y normalización a `snake_case`.

**Tech Stack:** React (TypeScript), Supabase, Vite, Sonner (Toasts).

---

### Task 1: Estabilización de Rutas (Eliminar Lazy Loading)

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Reemplazar imports dinámicos por estáticos**

```typescript
// En src/App.tsx, cambiar:
import Dashboard from './pages/Dashboard';
import Visitas from './pages/Visitas';
import Tareas from './pages/Tareas';
import Reportes from './pages/Reportes';
import BaseDatos from './pages/BaseDatos';
import Novedades from './pages/Novedades';
import Configuracion from './pages/Configuracion';
import DebugDB from './pages/DebugDB';
import Login from './pages/Login';
import Notificaciones from './pages/Notificaciones';

// Y eliminar las líneas:
// const Dashboard = lazy(() => import('./pages/Dashboard'));
// ...
```

- [ ] **Step 2: Eliminar Suspense de PageTransition**

```typescript
// En src/App.tsx, simplificar PageTransition:
function PageTransition({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

- [ ] **Step 3: Verificar que la aplicación carga sin Skeletons iniciales**

Run: `npm run dev`
Expected: Al navegar, las páginas intentan renderizarse inmediatamente.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "fix: replace lazy loading with static imports to fix infinite skeletons"
```

---

### Task 2: Robustez en la Capa de Datos (Timeouts y Errores)

**Files:**
- Modify: `src/db/client.ts`

- [ ] **Step 1: Implementar función de timeout para promesas**

```typescript
// En src/db/client.ts, añadir:
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number = 8000): Promise<T> {
  let timeoutId: any;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout: La operación tardó más de ${timeoutMs}ms`));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}
```

- [ ] **Step 2: Actualizar el listener de Auth para ser más resiliente**

```typescript
// Asegurar que el listener no bloquee el estado inicial si la DB falla
supabase.auth.onAuthStateChange(async (_event, session) => {
  _currentUserId = session?.user?.id || null;
  _currentUserEmail = session?.user?.email || null;
  if (_currentUserId) {
    try {
      // Usar timeout para la carga del rol
      const { data } = await withTimeout(
        supabase.from('users').select('role').eq('id', _currentUserId).single(),
        3000
      );
      _currentUserRole = data?.role || 'user';
    } catch (err) {
      console.error('[Auth] Error loading role:', err);
      _currentUserRole = 'user';
    }
  } else {
    _currentUserRole = null;
  }
});
```

- [ ] **Step 3: Commit**

```bash
git add src/db/client.ts
git commit -m "feat: add withTimeout wrapper and improve auth resilience"
```

---

### Task 3: Normalización de Esquema en Tareas

**Files:**
- Modify: `src/db/tasks.ts`
- Modify: `src/pages/Tareas.tsx`

- [ ] **Step 1: Asegurar snake_case en todas las consultas de tasks**

```typescript
// En src/db/tasks.ts, verificar:
export async function getTasks(): Promise<Task[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data.map(mapTask);
}

// Asegurar que mapTask use nombres correctos de la DB
function mapTask(row: Record<string, any>): Task {
  return {
    id: row.id,
    title: row.title,
    description: row.description || '',
    priority: row.priority || 'media',
    status: row.status || 'pendiente',
    createdAt: row.created_at || '', // <--- snake_case
    authorId: row.author_id || '',    // <--- snake_case
    dueDate: row.due_date || '',      // <--- snake_case
    // ... rest
  };
}
```

- [ ] **Step 2: Aplicar withTimeout en Tareas.tsx**

```typescript
// En src/pages/Tareas.tsx, envolver la carga inicial:
useEffect(() => {
  const unsub = onTasksChange((data) => {
    setTasks(data as any);
    setLoading(false);
  });
  // Timeout de seguridad para el loading inicial
  const timer = setTimeout(() => setLoading(false), 5000);
  return () => {
    unsub();
    clearTimeout(timer);
  };
}, []);
```

- [ ] **Step 3: Commit**

```bash
git add src/db/tasks.ts src/pages/Tareas.tsx
git commit -m "fix: normalize tasks schema and add loading safety"
```

---

### Task 4: Reparación de Dashboard y Novedades

**Files:**
- Modify: `src/pages/Dashboard.tsx`
- Modify: `src/pages/Novedades.tsx`

- [ ] **Step 1: Asegurar cierre de loading en Dashboard**

```typescript
// En src/pages/Dashboard.tsx, usar finally y timeout
useEffect(() => {
  const loadData = async () => {
    const safetyTimer = setTimeout(() => setLoading(false), 8000);
    try {
      const [tasksData, visitsData, novedadesData] = await Promise.all([
        getTasks(),
        getVisitas(),
        getNovedades(),
      ]);
      setTasks(tasksData);
      setVisits(visitsData);
      setNovedades(novedadesData);
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast.error('Error al conectar con Supabase');
    } finally {
      clearTimeout(safetyTimer);
      setLoading(false);
    }
  };
  loadData();
}, []);
```

- [ ] **Step 2: Asegurar cierre de loading en Novedades**

```typescript
// En src/pages/Novedades.tsx
const loadNovedades = async () => {
  try {
    const data = await withTimeout(getNovedades());
    setNovedades(data);
  } catch (error) {
    console.error('Error loading novedades:', error);
    toast.error('No se pudieron cargar las novedades');
  } finally {
    setLoading(false);
  }
};
```

- [ ] **Step 3: Commit**

```bash
git add src/pages/Dashboard.tsx src/pages/Novedades.tsx
git commit -m "fix: ensure loading closes in dashboard and novedades"
```

---

### Task 5: Validación Final de Conectividad

- [ ] **Step 1: Verificar el archivo .env**

Asegurar que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` sean correctos y no tengan espacios extra.

- [ ] **Step 2: Test de navegación completa**

Navegar por: Dashboard -> Tareas -> Novedades -> Base de Datos.
Verificar que ninguna se queda en blanco/skeleton tras 8 segundos.

- [ ] **Step 3: Commit final**

```bash
git commit --allow-empty -m "docs: finalize supabase stabilization plan implementation"
```
