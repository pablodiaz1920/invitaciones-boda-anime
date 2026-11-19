-- =====================================================================
-- Configuración segura de la tabla de invitados
-- Ejecutar completo en el SQL Editor de Supabase:
-- https://supabase.com/dashboard/project/dvaovixgslfacztmkbkh/sql/new
--
-- ANTES DE EJECUTAR: cambia 'TU_EMAIL_DE_ADMIN' (paso 3) por el email con
-- el que inicias sesión en /admin. Puedes añadir más de uno.
--
-- DESPUÉS: en Authentication → Sign In / Providers desactiva
-- "Allow new users to sign up" para que nadie pueda crearse una cuenta.
--
-- Modelo de seguridad:
--   * Los invitados (anon) NO pueden leer ni escribir la tabla directamente.
--     Solo pueden llamar a get_invitation() y submit_rsvp() con su token,
--     y cada llamada solo toca la fila de ese token.
--   * Solo los emails de admin_emails pueden ver/crear/editar/borrar invitados.
-- El script se puede ejecutar varias veces sin problema.
-- =====================================================================

-- 1. Tabla y columnas -------------------------------------------------
CREATE TABLE IF NOT EXISTS public.guests (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name TEXT NOT NULL,
  passes INTEGER NOT NULL DEFAULT 1,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  rsvp_status TEXT,
  food_restrictions TEXT,
  song TEXT,
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS attending INTEGER;        -- personas que asistirán
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;    -- primera vez que abrió su link
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS responded_at TIMESTAMPTZ; -- última respuesta

-- Quienes confirmaron antes de existir "attending": se asume que vienen todos sus pases
UPDATE public.guests SET attending = passes WHERE rsvp_status = 'yes' AND attending IS NULL;
UPDATE public.guests SET attending = 0      WHERE rsvp_status = 'no'  AND attending IS NULL;

ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_rsvp_status_check;
ALTER TABLE public.guests ADD CONSTRAINT guests_rsvp_status_check
  CHECK (rsvp_status IS NULL OR rsvp_status IN ('yes', 'no'));

ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_passes_check;
ALTER TABLE public.guests ADD CONSTRAINT guests_passes_check CHECK (passes BETWEEN 1 AND 20);

-- 2. RLS: cerrar la tabla ---------------------------------------------
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_select_all"   ON public.guests;
DROP POLICY IF EXISTS "allow_insert_admin" ON public.guests;
DROP POLICY IF EXISTS "allow_update_own"   ON public.guests;
DROP POLICY IF EXISTS "allow_delete_admin" ON public.guests;
DROP POLICY IF EXISTS "admin_all"          ON public.guests;

REVOKE ALL ON public.guests FROM anon;

-- 3. Administradores --------------------------------------------------
CREATE TABLE IF NOT EXISTS public.admin_emails (
  email TEXT PRIMARY KEY
);
ALTER TABLE public.admin_emails ENABLE ROW LEVEL SECURITY; -- sin políticas: nadie la lee por la API
REVOKE ALL ON public.admin_emails FROM anon, authenticated;

INSERT INTO public.admin_emails (email) VALUES
  ('TU_EMAIL_DE_ADMIN')
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.admin_emails
    WHERE lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

CREATE POLICY "admin_all" ON public.guests
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- 4. Fecha límite para confirmar (15 dic 2026, fin del día, hora de RD) --
CREATE OR REPLACE FUNCTION public.rsvp_deadline()
RETURNS TIMESTAMPTZ
LANGUAGE sql IMMUTABLE
AS $$ SELECT TIMESTAMPTZ '2026-12-16 00:00:00-04'; $$;

-- 5. Funciones públicas para el invitado --------------------------------

-- Devuelve la invitación de un token y marca la primera apertura.
DROP FUNCTION IF EXISTS public.get_invitation(TEXT);
CREATE FUNCTION public.get_invitation(p_token TEXT)
RETURNS TABLE (
  name TEXT,
  passes INTEGER,
  rsvp_status TEXT,
  attending INTEGER,
  food_restrictions TEXT,
  song TEXT,
  message TEXT,
  deadline TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
  UPDATE public.guests g
     SET opened_at = now()
   WHERE g.token::text = p_token AND g.opened_at IS NULL;

  RETURN QUERY
    SELECT g.name, g.passes, g.rsvp_status, g.attending,
           g.food_restrictions, g.song, g.message, public.rsvp_deadline()
      FROM public.guests g
     WHERE g.token::text = p_token;
END;
$$;

-- Guarda (o modifica) la respuesta. Solo toca los campos de respuesta,
-- nunca el nombre ni los pases, y valida todo en el servidor.
DROP FUNCTION IF EXISTS public.submit_rsvp(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT);
CREATE FUNCTION public.submit_rsvp(
  p_token TEXT,
  p_status TEXT,
  p_attending INTEGER,
  p_food TEXT,
  p_song TEXT,
  p_message TEXT
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_passes INTEGER;
BEGIN
  IF now() >= public.rsvp_deadline() THEN
    RAISE EXCEPTION 'RSVP_CLOSED';
  END IF;

  IF p_status IS NULL OR p_status NOT IN ('yes', 'no') THEN
    RAISE EXCEPTION 'INVALID_STATUS';
  END IF;

  SELECT g.passes INTO v_passes FROM public.guests g WHERE g.token::text = p_token;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'INVALID_TOKEN';
  END IF;

  IF p_status = 'yes' AND (p_attending IS NULL OR p_attending < 1 OR p_attending > v_passes) THEN
    RAISE EXCEPTION 'INVALID_ATTENDING';
  END IF;

  UPDATE public.guests g SET
    rsvp_status       = p_status,
    attending         = CASE WHEN p_status = 'yes' THEN p_attending ELSE 0 END,
    food_restrictions = CASE WHEN p_status = 'yes' THEN left(nullif(btrim(p_food), ''), 300) END,
    song              = CASE WHEN p_status = 'yes' THEN left(nullif(btrim(p_song), ''), 200) END,
    message           = left(nullif(btrim(p_message), ''), 1000),
    responded_at      = now()
  WHERE g.token::text = p_token;
END;
$$;

REVOKE ALL ON FUNCTION public.get_invitation(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_rsvp(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_rsvp(TEXT, TEXT, INTEGER, TEXT, TEXT, TEXT) TO anon, authenticated;
