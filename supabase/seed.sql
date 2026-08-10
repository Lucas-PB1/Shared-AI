-- Dados fictícios só para dev local (supabase start / db reset).
-- Nunca copiar para o git com trechos de código reais de clientes.

INSERT INTO public.projects (slug, name, github_owner, github_repo)
VALUES
  ('hostdime-ia', 'HostDime IA (local)', 'HostDimeBR', 'hostdime-ia'),
  -- Tema HubSpot (hsproject name=hostdime; repo GitHub=hostdime-hub)
  ('hostdime-hub', 'HostDime tema HubSpot', 'HostDimeBR', 'hostdime-hub'),
  ('hostdime', 'HostDime tema (alias hsproject)', 'HostDimeBR', 'hostdime-hub'),
  ('demo-app', 'Demo App', 'hostdime', 'demo-app')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO public.review_runs (
  project_id,
  source,
  actor_kind,
  actor_ref,
  git_sha,
  branch,
  status,
  finished_at
)
SELECT
  p.id,
  'local',
  'human',
  'local-dev',
  'deadbeef',
  'main',
  'completed',
  now()
FROM public.projects p
WHERE p.slug = 'hostdime-ia'
  AND NOT EXISTS (
    SELECT 1 FROM public.review_runs r WHERE r.project_id = p.id
  );
