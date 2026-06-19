-- Alterar las columnas conflictivas para quitar el límite de caracteres cambiando VARCHAR a TEXT
ALTER TABLE public.relevamiento_equipamiento_radioelectrico 
  ALTER COLUMN id_p25 TYPE TEXT,
  ALTER COLUMN id_gebipa TYPE TEXT,
  ALTER COLUMN inventario_gebipa TYPE TEXT,
  ALTER COLUMN modelo TYPE TEXT,
  ALTER COLUMN caracteristica_equipo TYPE TEXT,
  ALTER COLUMN ubicacion_interna TYPE TEXT,
  ALTER COLUMN estado TYPE TEXT,
  ALTER COLUMN nro_serie TYPE TEXT;
