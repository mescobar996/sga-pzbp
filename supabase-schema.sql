-- ================================================
-- SGO-PZBP: Supabase Schema
-- Pegar en: Supabase Dashboard → SQL Editor → New Query → Run
-- ================================================

-- 1. USERS (profiles linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  "photoURL" TEXT DEFAULT '',
  role TEXT NOT NULL DEFAULT 'user'
);

-- 2. TASKS
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'media',
  status TEXT NOT NULL DEFAULT 'pendiente',
  "dueDate" TEXT DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "assignedTo" TEXT DEFAULT '',
  "authorId" TEXT NOT NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  subtasks JSONB DEFAULT '[]'::jsonb,
  recurrence TEXT DEFAULT 'none',
  comments JSONB DEFAULT '[]'::jsonb
);

-- 3. TASK_HISTORY
CREATE TABLE IF NOT EXISTS public.task_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "taskId" TEXT NOT NULL,
  "taskTitle" TEXT NOT NULL,
  action TEXT NOT NULL,
  "timestamp" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "userEmail" TEXT NOT NULL
);

-- 4. PERSONAL
CREATE TABLE IF NOT EXISTS public.personal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Activo',
  "createdAt" TEXT NOT NULL,
  "authorId" TEXT NOT NULL
);

-- 5. LOCATIONS (con lat/lng nativo, sin restricciones locas)
CREATE TABLE IF NOT EXISTS public.locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'Origen',
  status TEXT NOT NULL DEFAULT 'Operativo',
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  "createdAt" TEXT NOT NULL,
  "authorId" TEXT NOT NULL
);

-- 6. VISITAS
CREATE TABLE IF NOT EXISTS public.visitas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  origen TEXT NOT NULL,
  destino TEXT NOT NULL,
  fecha TEXT NOT NULL,
  hora TEXT NOT NULL,
  responsable TEXT NOT NULL,
  observaciones TEXT DEFAULT '',
  "createdAt" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  comments JSONB DEFAULT '[]'::jsonb
);

-- 7. NOVEDADES
CREATE TABLE IF NOT EXISTS public.novedades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  "createdAt" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorName" TEXT NOT NULL DEFAULT '',
  attachments JSONB DEFAULT '[]'::jsonb
);

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'tarea',
  "createdAt" TEXT NOT NULL,
  "authorId" TEXT NOT NULL
);

-- ================================================
-- ENABLE ROW LEVEL SECURITY
-- ================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.personal ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visitas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.novedades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- ================================================
-- RLS POLICIES (all authenticated users can CRUD)
-- ================================================

-- Users
CREATE POLICY "users_select" ON public.users FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "users_update" ON public.users FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Tasks
CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated USING (true);
CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "tasks_update" ON public.tasks FOR UPDATE TO authenticated USING (true);
CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated USING (true);

-- Task History
CREATE POLICY "task_history_select" ON public.task_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "task_history_insert" ON public.task_history FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "task_history_delete" ON public.task_history FOR DELETE TO authenticated USING (true);

-- Personal
CREATE POLICY "personal_select" ON public.personal FOR SELECT TO authenticated USING (true);
CREATE POLICY "personal_insert" ON public.personal FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "personal_update" ON public.personal FOR UPDATE TO authenticated USING (true);
CREATE POLICY "personal_delete" ON public.personal FOR DELETE TO authenticated USING (true);

-- Locations
CREATE POLICY "locations_select" ON public.locations FOR SELECT TO authenticated USING (true);
CREATE POLICY "locations_insert" ON public.locations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "locations_update" ON public.locations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "locations_delete" ON public.locations FOR DELETE TO authenticated USING (true);

-- Visitas
CREATE POLICY "visitas_select" ON public.visitas FOR SELECT TO authenticated USING (true);
CREATE POLICY "visitas_insert" ON public.visitas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "visitas_update" ON public.visitas FOR UPDATE TO authenticated USING (true);
CREATE POLICY "visitas_delete" ON public.visitas FOR DELETE TO authenticated USING (true);

-- Novedades
CREATE POLICY "novedades_select" ON public.novedades FOR SELECT TO authenticated USING (true);
CREATE POLICY "novedades_insert" ON public.novedades FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "novedades_update" ON public.novedades FOR UPDATE TO authenticated USING (true);
CREATE POLICY "novedades_delete" ON public.novedades FOR DELETE TO authenticated USING (true);

-- Notifications
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated USING (true);

-- ================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email, "photoURL", role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', ''),
    CASE WHEN NEW.email = 'matialeescobar96@gmail.com' THEN 'admin' ELSE 'user' END
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- ENABLE REALTIME ON ALL TABLES
-- ================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_history;
ALTER PUBLICATION supabase_realtime ADD TABLE public.personal;
ALTER PUBLICATION supabase_realtime ADD TABLE public.locations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.visitas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.novedades;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
