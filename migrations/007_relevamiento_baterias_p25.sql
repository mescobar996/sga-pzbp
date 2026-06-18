CREATE TABLE IF NOT EXISTS public.relevamiento_baterias_p25 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    destinatario_sigla VARCHAR(10) NOT NULL,
    en_funcionamiento INTEGER DEFAULT 0 NOT NULL,
    fuera_de_servicio INTEGER DEFAULT 0 NOT NULL,
    observaciones TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    author_name VARCHAR(100) NOT NULL,
    CONSTRAINT unique_location_baterias_p25 UNIQUE (location_id)
);
ALTER TABLE public.relevamiento_baterias_p25 ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.relevamiento_baterias_p25;
DROP POLICY IF EXISTS "Permitir inserción/edición a usuarios autenticados" ON public.relevamiento_baterias_p25;
CREATE POLICY "Permitir lectura a usuarios autenticados" ON public.relevamiento_baterias_p25 FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir inserción/edición a usuarios autenticados" ON public.relevamiento_baterias_p25 FOR ALL TO authenticated USING (true);
