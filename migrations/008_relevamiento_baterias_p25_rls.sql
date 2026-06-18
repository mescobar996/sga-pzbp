-- Eliminar políticas viejas y ambiguas
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.relevamiento_baterias_p25;
DROP POLICY IF EXISTS "Permitir inserción/edición a usuarios autenticados" ON public.relevamiento_baterias_p25;

-- 1. Política estricta para lectura (SELECT)
CREATE POLICY "relevamiento_baterias_p25_select" 
ON public.relevamiento_baterias_p25 FOR SELECT 
TO authenticated 
USING (true);

-- 2. Política estricta para inserciones (INSERT)
CREATE POLICY "relevamiento_baterias_p25_insert" 
ON public.relevamiento_baterias_p25 FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- 3. Política estricta para modificaciones (UPDATE)
CREATE POLICY "relevamiento_baterias_p25_update" 
ON public.relevamiento_baterias_p25 FOR UPDATE 
TO authenticated 
USING (true) 
WITH CHECK (true);
