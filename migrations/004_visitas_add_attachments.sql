-- ============================================================
-- VISITAS: Agregar columna attachments JSONB
-- ============================================================

ALTER TABLE visitas ADD COLUMN IF NOT EXISTS attachments jsonb DEFAULT '[]'::jsonb;
