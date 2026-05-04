-- ============================================================
-- DILIGENCIAMIENTO_CATEGORIES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS diligenciamiento_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  icon text DEFAULT 'Layout',
  color text DEFAULT 'bg-[#1a1a1a]',
  author_id uuid REFERENCES users(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE diligenciamiento_categories ENABLE ROW LEVEL SECURITY;

-- ALL authenticated users can READ categories
CREATE POLICY "Authenticated users can read categories"
  ON diligenciamiento_categories FOR SELECT
  TO authenticated
  USING (true);

-- ONLY admins can INSERT categories
CREATE POLICY "Only admins can insert categories"
  ON diligenciamiento_categories FOR INSERT
  TO authenticated
  WITH CHECK (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ONLY admins can UPDATE categories
CREATE POLICY "Only admins can update categories"
  ON diligenciamiento_categories FOR UPDATE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- ONLY admins can DELETE categories
CREATE POLICY "Only admins can delete categories"
  ON diligenciamiento_categories FOR DELETE
  TO authenticated
  USING (
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );
