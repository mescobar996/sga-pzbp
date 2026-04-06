-- ============================================================
-- DILIGENCIAMIENTOS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS diligenciamientos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text,
  author_id uuid REFERENCES users(id),
  author_name text,
  attachments jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diligenciamientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read diligenciamientos"
  ON diligenciamientos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert diligenciamientos"
  ON diligenciamientos FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update diligenciamientos"
  ON diligenciamientos FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Admins can delete diligenciamientos"
  ON diligenciamientos FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
