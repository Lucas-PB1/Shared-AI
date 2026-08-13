-- App admin flag for settings + cloud→local sync (not a project role).

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.is_app_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.is_admin = true
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_app_admin() TO authenticated;

-- Admins podem ler a flag de outros (só is_admin) via select de profiles já coberto
-- por is_profile_visible; updates de is_admin ficam só service_role / SQL manual.
