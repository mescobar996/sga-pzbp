CREATE TABLE IF NOT EXISTS public.relevamiento_equipamiento_radioelectrico (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    location_id UUID REFERENCES public.locations(id) ON DELETE CASCADE,
    destinatario_sigla VARCHAR(10) NOT NULL,
    ubicacion_interna VARCHAR(150),
    id_p25 VARCHAR(50),
    id_gebipa VARCHAR(50),
    inventario_gebipa VARCHAR(50),
    nro_serie VARCHAR(100) NOT NULL,
    modelo VARCHAR(50) NOT NULL,
    caracteristica_equipo VARCHAR(100),
    accesorios TEXT,
    estado VARCHAR(50) NOT NULL,
    observaciones TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    author_name VARCHAR(100) NOT NULL
);

ALTER TABLE public.relevamiento_equipamiento_radioelectrico ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "equip_radio_select" ON public.relevamiento_equipamiento_radioelectrico;
DROP POLICY IF EXISTS "equip_radio_insert" ON public.relevamiento_equipamiento_radioelectrico;
DROP POLICY IF EXISTS "equip_radio_update" ON public.relevamiento_equipamiento_radioelectrico;
CREATE POLICY "equip_radio_select" ON public.relevamiento_equipamiento_radioelectrico FOR SELECT TO authenticated USING (true);
CREATE POLICY "equip_radio_insert" ON public.relevamiento_equipamiento_radioelectrico FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "equip_radio_update" ON public.relevamiento_equipamiento_radioelectrico FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
