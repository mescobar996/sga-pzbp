# Design Doc: Firebase → Supabase Migration (Adapter Pattern)

**Date:** 2026-04-05  
**Status:** Approved by user  
**Approach:** Adapter Pattern (Opción B)

---

## Problem Statement

Reemplazar Firebase Auth + Firestore + Storage por Supabase Auth + PostgreSQL + Supabase Storage, manteniendo el 100% de la funcionalidad existente. La app es un sistema de gestión operativa con tareas, visitas, novedades, personal, ubicaciones y notificaciones.

---

## Architecture

### Pattern: Database Adapter Layer

En vez de que cada página importe directamente de Supabase, creamos una capa de abstracción en `src/db/` con funciones semánticas por entidad.

```
src/
├── db/
│   ├── client.ts          # Supabase client + auth helpers
│   ├── tasks.ts           # CRUD tasks, comments, attachments
│   ├── visitas.ts         # CRUD visitas + comments
│   ├── novedades.ts       # CRUD novedades + attachments
│   ├── personal.ts        # CRUD personal
│   ├── locations.ts       # CRUD locations
│   ├── notifications.ts   # CRUD notifications
│   └── taskHistory.ts     # CRUD task_history
├── supabase.ts            # Re-export de db/client.ts
├── App.tsx                # supabase.auth.onAuthStateChange
├── pages/Login.tsx        # supabase.auth.signInWithOAuth
├── pages/Tareas.tsx       # import { tasks } from '@/db/tasks'
├── pages/Visitas.tsx      # import { visitas } from '@/db/visitas'
├── pages/Novedades.tsx    # import { novedades } from '@/db/novedades'
├── pages/Dashboard.tsx    # queries Supabase
├── pages/Reportes.tsx     # queries Supabase
├── pages/BaseDatos.tsx    # import { personal, locations }
├── pages/Notificaciones.tsx
├── pages/Configuracion.tsx
├── components/Layout.tsx  # Realtime subscriptions
└── types/index.ts         # Tipos actuales (se mantienen)
```

### Adapter Module Pattern

Cada módulo exporta funciones CRUD + listener de realtime:

```typescript
// CRUD functions
export async function getTasks(): Promise<Task[]>
export async function addTask(task: Omit<Task, 'id' | 'createdAt'>): Promise<Task>
export async function updateTask(id: string, updates: Partial<Task>): Promise<void>
export async function deleteTask(id: string): Promise<void>

// Realtime
export function onTasksChange(callback: (tasks: Task[]) => void): () => void
```

**Beneficio:** Si algo falla, solo se toca un archivo. Las páginas importan funciones con nombres claros. Fácil de testear unitariamente.

---

## Database Schema

### Tables

#### `users` (vinculada a auth.users)
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK | FK → auth.users.id |
| `name` | text | |
| `email` | text UNIQUE | |
| `role` | text DEFAULT 'user' | 'admin' o 'user' |
| `photo_url` | text | |
| `created_at` | timestamptz DEFAULT now() | |

#### `tasks`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `title` | text NOT NULL | |
| `description` | text | |
| `priority` | text DEFAULT 'media' | 'alta', 'media', 'baja' |
| `status` | text DEFAULT 'pendiente' | 'pendiente', 'en_proceso', 'completado' |
| `due_date` | date | |
| `author_id` | uuid REFERENCES users(id) | |
| `assigned_to` | uuid REFERENCES users(id) | |
| `tags` | text[] | PostgreSQL array nativo |
| `attachments` | jsonb | Array de {name, url, type, size} |
| `subtasks` | jsonb | Array de {id, title, completed} |
| `comments` | jsonb | Array de {id, authorId, authorName, content, createdAt} |
| `recurrence` | text DEFAULT 'none' | 'none', 'diaria', 'semanal', 'mensual' |
| `created_at` | timestamptz DEFAULT now() | |

#### `task_history`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `task_id` | uuid | |
| `task_title` | text | |
| `action` | text | 'completado', 'eliminado' |
| `user_id` | uuid REFERENCES users(id) | |
| `user_email` | text | |
| `timestamp` | timestamptz DEFAULT now() | |

#### `personal`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `name` | text NOT NULL | |
| `role` | text | |
| `status` | text DEFAULT 'Activo' | 'Activo', 'Inactivo' |
| `author_id` | uuid REFERENCES users(id) | |
| `created_at` | timestamptz DEFAULT now() | |

#### `locations`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `name` | text NOT NULL | |
| `type` | text | 'Origen', 'Destino', 'Origen/Destino' |
| `status` | text DEFAULT 'Operativo' | 'Operativo', 'Mantenimiento', 'Inactivo' |
| `latitude` | float8 | PostgreSQL float nativo |
| `longitude` | float8 | PostgreSQL float nativo |
| `author_id` | uuid REFERENCES users(id) | |
| `created_at` | timestamptz DEFAULT now() | |

#### `visitas`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `origen` | text NOT NULL | |
| `destino` | text NOT NULL | |
| `fecha` | date NOT NULL | |
| `hora` | time | |
| `responsable` | text | |
| `observaciones` | text | |
| `comments` | jsonb | Array de comentarios |
| `author_id` | uuid REFERENCES users(id) | |
| `created_at` | timestamptz DEFAULT now() | |

#### `novedades`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `title` | text NOT NULL | |
| `content` | text | |
| `author_id` | uuid REFERENCES users(id) | |
| `author_name` | text | |
| `attachments` | jsonb | Array de {name, url, type, size} |
| `created_at` | timestamptz DEFAULT now() | |

#### `notifications`
| Column | Type | Notes |
|--------|------|-------|
| `id` | uuid PK DEFAULT gen_random_uuid() | |
| `title` | text NOT NULL | |
| `message` | text | |
| `type` | text | 'tarea', 'visita', 'novedad' |
| `author_id` | uuid REFERENCES users(id) | |
| `recipient_id` | uuid REFERENCES users(id) | |
| `created_at` | timestamptz DEFAULT now() | |

### Row Level Security (RLS)

Todas las tablas tienen:
- `RLS enabled`
- `SELECT` → cualquier usuario autenticado (`auth.role() = 'authenticated'`)
- `INSERT/UPDATE/DELETE` → solo admins (`(SELECT role FROM users WHERE id = auth.uid()) = 'admin'`)
- Exceptions: usuarios pueden INSERTar en todas las tablas (los datos se crean con su `author_id`), pero solo admins pueden DELETE

### Triggers

**`handle_new_user()`**: Cuando un nuevo usuario se registra en Supabase Auth, automáticamente crea un row en `users` con su email, name y photo_url.

---

## Auth Migration

### Login (`src/pages/Login.tsx`)
- **Antes:** `signInWithPopup(auth, googleProvider)` de Firebase
- **Después:** `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })`

### Auth State (`src/App.tsx`)
- **Antes:** `onAuthStateChanged(auth, callback)` de Firebase
- **Después:** `supabase.auth.onAuthStateChange((event, session) => callback(session?.user || null))`

### Session Management
- Supabase maneja sesiones automáticamente con cookies/localStorage
- No se necesita middleware (no es Next.js, es Vite SPA)
- El client de Supabase refresca tokens automáticamente

### User Profile (`src/pages/Configuracion.tsx`)
- **Antes:** Firebase `updateProfile()`, `updatePassword()`
- **Después:** `supabase.auth.updateUser()`, `supabase.auth.updateUser({ password })`

---

## Storage Migration

### Bucket: `attachments`

- **Antes:** `firebase.storage().ref().put(file).getDownloadURL()`
- **Después:** `supabase.storage.from('attachments').upload(path, file)` + `.getPublicUrl(path)`

### Storage RLS
- `SELECT` → usuarios autenticados
- `INSERT` → usuarios autenticados
- `DELETE` → solo admins

---

## Files to Create

| File | Purpose |
|------|---------|
| `migrations/001_initial_schema.sql` | SQL completo: tablas, RLS, triggers |
| `src/db/client.ts` | Supabase client + auth helpers |
| `src/db/tasks.ts` | Tasks CRUD + realtime |
| `src/db/visitas.ts` | Visitas CRUD + realtime |
| `src/db/novedades.ts` | Novedades CRUD + storage |
| `src/db/personal.ts` | Personal CRUD |
| `src/db/locations.ts` | Locations CRUD |
| `src/db/notifications.ts` | Notifications CRUD |
| `src/db/taskHistory.ts` | Task history CRUD |

## Files to Modify

| File | Change |
|------|--------|
| `src/supabase.ts` | Re-export desde `db/client.ts` |
| `src/App.tsx` | Firebase auth → Supabase auth |
| `src/pages/Login.tsx` | Firebase popup → Supabase OAuth |
| `src/pages/Tareas.tsx` | Firestore → `db/tasks` |
| `src/pages/Visitas.tsx` | Firestore → `db/visitas` |
| `src/pages/Novedades.tsx` | Firestore + Storage → `db/novedades` |
| `src/pages/Dashboard.tsx` | Firestore → Supabase queries |
| `src/pages/Reportes.tsx` | Firestore → Supabase queries |
| `src/pages/BaseDatos.tsx` | Firestore → `db/personal` + `db/locations` |
| `src/pages/Notificaciones.tsx` | Firestore → `db/notifications` |
| `src/pages/Configuracion.tsx` | Firebase auth → Supabase auth |
| `src/components/Layout.tsx` | Firestore onSnapshot → Supabase realtime |
| `src/types/index.ts` | Actualizar si necesario |
| `.env.example` | Variables Supabase en vez de Firebase |
| `package.json` | Quitar `firebase` dependencia |

## Files to Delete

| File | Reason |
|------|--------|
| `src/firebase.ts` | Reemplazado por `src/db/client.ts` |

## Environment Variables

### Antes
```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_APP_ID=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_FIRESTORE_DATABASE_ID=
VITE_FIREBASE_MEASUREMENT_ID=
```

### Después
```
VITE_SUPABASE_URL=https://qydbowdkgnprdkzaafkl.supabase.co
VITE_SUPABASE_ANON_KEY=
```

---

## Out of Scope

1. **Google OAuth setup** — El usuario debe activarlo en Supabase Dashboard
2. **Data migration** — Migrar datos existentes de Firestore se hace por separado
3. **Realtime avanzado** — Polling básico funciona; optimización con Supabase Realtime Channels se puede hacer después
4. **Testing infrastructure changes** — Se actualizan tests existentes pero no se crea infraestructura nueva de testing

---

## Success Criteria

1. App compila sin errores (`npm run build`)
2. Login funciona con Google OAuth (después de activar provider)
3. Todas las páginas cargan datos correctamente
4. CRUD operations funcionan en todas las entidades
5. Storage funciona para adjuntos
6. No hay imports de `firebase` en ningún archivo
7. `package.json` no incluye `firebase` como dependencia
8. `firebase.ts` eliminado
