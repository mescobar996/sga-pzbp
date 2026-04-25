-- ============================================================
-- SGO-PZBP: RLS Policies — Role-based write protection
-- Run this in Supabase SQL Editor
-- 
-- ALL authenticated users can READ everything
-- ONLY admins can INSERT / UPDATE / DELETE
-- ============================================================

-- Helper: check if current user is admin
-- Use this pattern: (SELECT role FROM users WHERE id = auth.uid()) = 'admin'

-- ============================================================
-- TASKS
-- ============================================================

-- Drop existing permissive policies
DROP POLICY IF EXISTS "Authenticated users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Authenticated users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Admins can delete tasks" ON tasks;

-- Only admins can INSERT
CREATE POLICY "Only admins can insert tasks"
  ON tasks FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can UPDATE
CREATE POLICY "Only admins can update tasks"
  ON tasks FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can DELETE
CREATE POLICY "Only admins can delete tasks"
  ON tasks FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- VISITAS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert visitas" ON visitas;
DROP POLICY IF EXISTS "Authenticated users can update visitas" ON visitas;
DROP POLICY IF EXISTS "Admins can delete visitas" ON visitas;

CREATE POLICY "Only admins can insert visitas"
  ON visitas FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can update visitas"
  ON visitas FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can delete visitas"
  ON visitas FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- NOVEDADES
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert novedades" ON novedades;
DROP POLICY IF EXISTS "Authenticated users can update novedades" ON novedades;
DROP POLICY IF EXISTS "Admins can delete novedades" ON novedades;

CREATE POLICY "Only admins can insert novedades"
  ON novedades FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can update novedades"
  ON novedades FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can delete novedades"
  ON novedades FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- DILIGENCIAMIENTOS
-- ============================================================

-- First check if table exists (it was added in migration 002)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diligenciamientos') THEN
    -- Drop existing permissive policies if they exist
    DROP POLICY IF EXISTS "Authenticated users can insert diligenciamientos" ON diligenciamientos;
    DROP POLICY IF EXISTS "Authenticated users can update diligenciamientos" ON diligenciamientos;
    DROP POLICY IF EXISTS "Authenticated users can delete diligenciamientos" ON diligenciamientos;

    -- Only admins can write
    CREATE POLICY "Only admins can insert diligenciamientos"
      ON diligenciamientos FOR INSERT
      TO authenticated
      WITH CHECK (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      );

    CREATE POLICY "Only admins can update diligenciamientos"
      ON diligenciamientos FOR UPDATE
      TO authenticated
      USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      );

    CREATE POLICY "Only admins can delete diligenciamientos"
      ON diligenciamientos FOR DELETE
      TO authenticated
      USING (
        (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
      );
  END IF;
END $$;

-- ============================================================
-- PERSONAL
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert personal" ON personal;
DROP POLICY IF EXISTS "Authenticated users can update personal" ON personal;
DROP POLICY IF EXISTS "Admins can delete personal" ON personal;

CREATE POLICY "Only admins can insert personal"
  ON personal FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can update personal"
  ON personal FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can delete personal"
  ON personal FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- LOCATIONS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert locations" ON locations;
DROP POLICY IF EXISTS "Authenticated users can update locations" ON locations;
DROP POLICY IF EXISTS "Admins can delete locations" ON locations;

CREATE POLICY "Only admins can insert locations"
  ON locations FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can update locations"
  ON locations FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Only admins can delete locations"
  ON locations FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- NOTIFICATIONS
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can delete own notifications" ON notifications;

-- Only admins can INSERT notifications
CREATE POLICY "Only admins can insert notifications"
  ON notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Users can only delete notifications they own or received
CREATE POLICY "Users can delete own notifications"
  ON notifications FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id OR auth.uid() = recipient_id);

-- ============================================================
-- TASK HISTORY (read-only, no changes needed)
-- Already INSERT allowed for logging, no UPDATE/DELETE policies
-- ============================================================

-- ============================================================
-- USERS — protect role field
-- ============================================================

DROP POLICY IF EXISTS "Users can update own profile" ON users;

-- Users can update their own profile BUT cannot change their role
CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM users WHERE id = auth.uid())
  );

-- Only admins can update other users' roles
CREATE POLICY "Admins can update any user"
  ON users FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- STORAGE — attachments
-- ============================================================

DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete attachments" ON storage.objects;

-- Only admins can upload
CREATE POLICY "Only admins can upload attachments"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'attachments'
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- Only admins can delete
CREATE POLICY "Only admins can delete attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'attachments'
    AND (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ============================================================
-- VERIFICATION: Check current policies
-- ============================================================
-- SELECT tablename, policyname, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE schemaname = 'public' 
-- ORDER BY tablename, cmd;
