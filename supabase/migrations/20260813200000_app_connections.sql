-- Connection profiles for local/cloud dashboard switching (secrets stay server-side).

CREATE TABLE IF NOT EXISTS public.app_connections (
  target text PRIMARY KEY CHECK (target IN ('local', 'cloud')),
  url text NOT NULL,
  publishable_key text NOT NULL DEFAULT '',
  secret_key text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_settings (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  active_target text NOT NULL DEFAULT 'local'
    CHECK (active_target IN ('local', 'cloud')),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_settings (id, active_target)
VALUES (1, 'local')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.app_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- Admins podem ler/escrever (UI via JWT). Secret nunca é enviado ao browser
-- pelas actions (só flags "definida").
DROP POLICY IF EXISTS app_connections_admin_all ON public.app_connections;
CREATE POLICY app_connections_admin_all
  ON public.app_connections
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

DROP POLICY IF EXISTS app_settings_admin_all ON public.app_settings;
CREATE POLICY app_settings_admin_all
  ON public.app_settings
  FOR ALL
  TO authenticated
  USING (public.is_app_admin())
  WITH CHECK (public.is_app_admin());

-- service_role bypassa RLS (bootstrap / sync).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_connections TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_settings TO authenticated;
GRANT ALL ON public.app_connections TO service_role;
GRANT ALL ON public.app_settings TO service_role;
