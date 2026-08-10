-- Projetos locais ligados (paths em ~/Projetos e registry hostdime-ia).
-- Slug = basename do path (dual-write / --slug).
-- Secrets do store ficam só no monorepo hostdime-ia — repos ligados sem .env.

INSERT INTO public.projects (slug, name, github_owner, github_repo)
VALUES
  ('hostdime-ia', 'HostDime IA', 'HostDimeBR', 'hostdime-ia'),
  ('dna', 'DNA', NULL, 'dna'),
  ('core', 'Core', NULL, 'core'),
  ('hdbr-hubspot', 'HDBR HubSpot (front-website)', 'HostDimeBR', 'front-website'),
  ('hdbr-payment', 'HDBR Payment', NULL, 'hdbr-payment'),
  ('hostdime-organograma', 'HostDime Organograma', 'HostDimeBR', 'hostdime-organograma'),
  ('hostdime', 'HostDime tema HubSpot (hostdime-hub)', 'HostDimeBR', 'hostdime-hub'),
  ('hostdime-theme-hub', 'HostDime theme hub (workspace)', NULL, NULL),
  ('hostdime-backend', 'HostDime theme hub backend', NULL, NULL),
  ('maps', 'Maps', 'Lucas-PB1', 'dnd-maps'),
  ('sicredi', 'Sicredi', NULL, NULL)
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
