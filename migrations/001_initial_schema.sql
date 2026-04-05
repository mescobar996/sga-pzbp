-- ============================================================
-- SGO-PZBP: Initial Schema — Firebase → Supabase Migration
-- Run this in Supabase SQL Editor
-- ============================================================

-- 1. USERS (linked to auth.users)
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name text,
  email text UNIQUE NOT NULL,
  role text DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  photo_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read all users"
  ON users FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON users FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 2. TASKS
CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  priority text DEFAULT 'media' CHECK (priority IN ('alta', 'media', 'baja')),
  status text DEFAULT 'pendiente' CHECK (status IN ('pendiente', 'en_proceso', 'completado')),
  due_date date,
  author_id uuid REFERENCES users(id),
  assigned_to uuid REFERENCES users(id),
  tags text[],
  attachments jsonb DEFAULT '[]'::jsonb,
  subtasks jsonb DEFAULT '[]'::jsonb,
  comments jsonb DEFAULT '[]'::jsonb,
  recurrence text DEFAULT 'none' CHECK (recurrence IN ('none', 'diaria', 'semanal', 'mensual')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tasks"
  ON tasks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
    OR auth.uid() = author_id
  );

-- 3. TASK HISTORY
CREATE TABLE IF NOT EXISTS task_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid,
  task_title text,
  action text CHECK (action IN ('completado', 'eliminado')),
  user_id uuid REFERENCES users(id),
  user_email text,
  timestamp timestamptz DEFAULT now()
);

ALTER TABLE task_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read task_history"
  ON task_history FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert task_history"
  ON task_history FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- 4. PERSONAL
CREATE TABLE IF NOT EXISTS personal (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text,
  status text DEFAULT 'Activo' CHECK (status IN ('Activo', 'Inactivo')),
  author_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE personal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read personal"
  ON personal FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert personal"
  ON personal FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update personal"
  ON personal FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete personal"
  ON personal FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 5. LOCATIONS
CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text CHECK (type IN ('Origen', 'Destino', 'Origen/Destino')),
  status text DEFAULT 'Operativo' CHECK (status IN ('Operativo', 'Mantenimiento', 'Inactivo')),
  latitude float8,
  longitude float8,
  author_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read locations"
  ON locations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 6. VISITAS
CREATE TABLE IF NOT EXISTS visitas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  origen text NOT NULL,
  destino text NOT NULL,
  fecha date NOT NULL,
  hora time,
  responsable text,
  observaciones text,
  comments jsonb DEFAULT '[]'::jsonb,
  author_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visitas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read visitas"
  ON visitas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert visitas"
  ON visitas FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update visitas"
  ON visitas FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete visitas"
  ON visitas FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 7. NOVEDADES
CREATE TABLE IF NOT EXISTS novedades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  author_id uuid REFERENCES users(id),
  author_name text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE novedades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read novedades"
  ON novedades FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert novedades"
  ON novedades FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update novedades"
  ON novedades FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete novedades"
  ON novedades FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 8. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text,
  type text CHECK (type IN ('tarea', 'visita', 'novedad')),
  author_id uuid REFERENCES users(id),
  recipient_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = recipient_id);

-- ============================================================
-- TRIGGER: Auto-create users row on signup
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, name, email, photo_url, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture'),
    CASE
      WHEN NEW.email = 'matialeescobar96@gmail.com' THEN 'admin'
      ELSE 'user'
    END
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STORAGE BUCKET: attachments
-- ============================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('attachments', 'attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can read attachments"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'attachments');

CREATE POLICY "Authenticated users can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'attachments');

CREATE POLICY "Admins can delete attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
