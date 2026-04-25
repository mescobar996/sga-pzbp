-- ============================================================
-- DILIGENCIAMIENTOS: Agregar columna fecha manual
-- ============================================================

ALTER TABLE diligenciamientos ADD COLUMN IF NOT EXISTS fecha date;
