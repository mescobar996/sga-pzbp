-- CREAR TABLA PARA RELEVAMIENTO LÍNEA 106 Y GRABADORAS
CREATE TABLE IF NOT EXISTS public.relevamiento_linea_106 (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    destinatario_sigla VARCHAR(10) NOT NULL,
    grabadora_audio TEXT,
    vhf_conectado TEXT,
    grabacion_vhf TEXT,
    observaciones_vhf TEXT,
    telefono_analogico TEXT,
    grabacion_106 TEXT,
    adaptador_rj11_divisor TEXT,
    adaptador_rj11_macho_hembra TEXT,
    observaciones_106 TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    author_name VARCHAR(100) NOT NULL
);

-- CONFIGURAR RLS (ROW LEVEL SECURITY)
ALTER TABLE public.relevamiento_linea_106 ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "linea106_select" ON public.relevamiento_linea_106;
DROP POLICY IF EXISTS "linea106_insert" ON public.relevamiento_linea_106;
DROP POLICY IF EXISTS "linea106_update" ON public.relevamiento_linea_106;

CREATE POLICY "linea106_select" ON public.relevamiento_linea_106 FOR SELECT TO authenticated USING (true);
CREATE POLICY "linea106_insert" ON public.relevamiento_linea_106 FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "linea106_update" ON public.relevamiento_linea_106 FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

