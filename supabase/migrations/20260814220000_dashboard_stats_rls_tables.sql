-- Dashboard: MV bruta em private + tabelas públicas com RLS.
-- Substitui views (badge UNRESTRICTED) — Postgres não faz RLS em VIEW.

CREATE SCHEMA IF NOT EXISTS private;

REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon, authenticated;
GRANT USAGE ON SCHEMA private TO postgres, service_role;

-- Remove superfícies antigas (MV pública, view, tabela ou *_data em public).
DROP VIEW IF EXISTS public.mv_dashboard_project_stats CASCADE;
DROP VIEW IF EXISTS public.mv_dashboard_weekly CASCADE;
DROP TABLE IF EXISTS public.mv_dashboard_project_stats CASCADE;
DROP TABLE IF EXISTS public.mv_dashboard_weekly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_project_stats CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_weekly CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_project_stats_data CASCADE;
DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_weekly_data CASCADE;
DROP MATERIALIZED VIEW IF EXISTS private.mv_dashboard_project_stats_data CASCADE;
DROP MATERIALIZED VIEW IF EXISTS private.mv_dashboard_weekly_data CASCADE;

CREATE MATERIALIZED VIEW private.mv_dashboard_project_stats_data AS
SELECT
  p.id AS project_id,
  COALESCE(r.runs, 0)::bigint AS runs,
  COALESCE(r.completed, 0)::bigint AS completed,
  COALESCE(r.failed, 0)::bigint AS failed,
  COALESCE(d.decisions, 0)::bigint AS decisions,
  COALESCE(d.aceitos, 0)::bigint AS aceitos,
  COALESCE(d.rejeitados, 0)::bigint AS rejeitados,
  COALESCE(d.nao_aplicavel, 0)::bigint AS nao_aplicavel,
  CASE
    WHEN COALESCE(d.aceitos, 0) + COALESCE(d.rejeitados, 0) > 0
    THEN ROUND(
      (COALESCE(d.aceitos, 0)::numeric * 1000)
        / (COALESCE(d.aceitos, 0) + COALESCE(d.rejeitados, 0))
    ) / 10
    ELSE NULL
  END AS acceptance_rate
FROM public.projects p
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*)::bigint AS runs,
    COUNT(*) FILTER (WHERE status = 'completed')::bigint AS completed,
    COUNT(*) FILTER (WHERE status = 'failed')::bigint AS failed
  FROM public.review_runs
  WHERE source = 'ci'
  GROUP BY project_id
) r ON r.project_id = p.id
LEFT JOIN (
  SELECT
    project_id,
    COUNT(*)::bigint AS decisions,
    COUNT(*) FILTER (WHERE verdict = 'aceito')::bigint AS aceitos,
    COUNT(*) FILTER (WHERE verdict = 'rejeitado')::bigint AS rejeitados,
    COUNT(*) FILTER (WHERE verdict = 'nao-aplicavel')::bigint AS nao_aplicavel
  FROM public.decisions
  WHERE source LIKE 'github-pr-%'
  GROUP BY project_id
) d ON d.project_id = p.id;

CREATE UNIQUE INDEX mv_dashboard_project_stats_data_project_id_uidx
  ON private.mv_dashboard_project_stats_data (project_id);

CREATE MATERIALIZED VIEW private.mv_dashboard_weekly_data AS
WITH run_weeks AS (
  SELECT
    project_id,
    (date_trunc('week', started_at AT TIME ZONE 'UTC'))::date AS week_start,
    COUNT(*)::bigint AS runs
  FROM public.review_runs
  WHERE source = 'ci'
  GROUP BY project_id, 2
),
decision_weeks AS (
  SELECT
    project_id,
    (date_trunc('week', finalized_at AT TIME ZONE 'UTC'))::date AS week_start,
    COUNT(*) FILTER (WHERE verdict = 'aceito')::bigint AS aceitos,
    COUNT(*) FILTER (WHERE verdict = 'rejeitado')::bigint AS rejeitados
  FROM public.decisions
  WHERE source LIKE 'github-pr-%'
  GROUP BY project_id, 2
)
SELECT
  COALESCE(r.project_id, d.project_id) AS project_id,
  COALESCE(r.week_start, d.week_start) AS week_start,
  COALESCE(r.runs, 0)::bigint AS runs,
  COALESCE(d.aceitos, 0)::bigint AS aceitos,
  COALESCE(d.rejeitados, 0)::bigint AS rejeitados
FROM run_weeks r
FULL OUTER JOIN decision_weeks d
  ON r.project_id = d.project_id
 AND r.week_start = d.week_start;

CREATE UNIQUE INDEX mv_dashboard_weekly_data_project_week_uidx
  ON private.mv_dashboard_weekly_data (project_id, week_start);

REVOKE ALL ON private.mv_dashboard_project_stats_data FROM PUBLIC;
REVOKE ALL ON private.mv_dashboard_weekly_data FROM PUBLIC;
REVOKE ALL ON private.mv_dashboard_project_stats_data FROM anon, authenticated;
REVOKE ALL ON private.mv_dashboard_weekly_data FROM anon, authenticated;
GRANT SELECT ON private.mv_dashboard_project_stats_data TO service_role;
GRANT SELECT ON private.mv_dashboard_weekly_data TO service_role;
GRANT ALL ON private.mv_dashboard_project_stats_data TO postgres;
GRANT ALL ON private.mv_dashboard_weekly_data TO postgres;

-- Tabelas na API (mesmos nomes que a app já usa) + RLS de verdade.
CREATE TABLE public.mv_dashboard_project_stats (
  project_id uuid PRIMARY KEY REFERENCES public.projects (id) ON DELETE CASCADE,
  runs bigint NOT NULL DEFAULT 0,
  completed bigint NOT NULL DEFAULT 0,
  failed bigint NOT NULL DEFAULT 0,
  decisions bigint NOT NULL DEFAULT 0,
  aceitos bigint NOT NULL DEFAULT 0,
  rejeitados bigint NOT NULL DEFAULT 0,
  nao_aplicavel bigint NOT NULL DEFAULT 0,
  acceptance_rate numeric
);

CREATE TABLE public.mv_dashboard_weekly (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  week_start date NOT NULL,
  runs bigint NOT NULL DEFAULT 0,
  aceitos bigint NOT NULL DEFAULT 0,
  rejeitados bigint NOT NULL DEFAULT 0,
  PRIMARY KEY (project_id, week_start)
);

CREATE INDEX mv_dashboard_weekly_week_start_idx
  ON public.mv_dashboard_weekly (week_start);

COMMENT ON TABLE public.mv_dashboard_project_stats IS
  'KPIs de dashboard por projeto (cópia das MVs private; RLS por membership).';

COMMENT ON TABLE public.mv_dashboard_weekly IS
  'Série semanal de runs/vereditos (cópia das MVs private; RLS por membership).';

ALTER TABLE public.mv_dashboard_project_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mv_dashboard_weekly ENABLE ROW LEVEL SECURITY;

CREATE POLICY dashboard_project_stats_select
  ON public.mv_dashboard_project_stats
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY dashboard_weekly_select
  ON public.mv_dashboard_weekly
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

GRANT SELECT ON public.mv_dashboard_project_stats TO authenticated, service_role;
GRANT SELECT ON public.mv_dashboard_weekly TO authenticated, service_role;
GRANT ALL ON public.mv_dashboard_project_stats TO service_role;
GRANT ALL ON public.mv_dashboard_weekly TO service_role;

CREATE OR REPLACE FUNCTION public.refresh_dashboard_mviews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW private.mv_dashboard_project_stats_data;
  REFRESH MATERIALIZED VIEW private.mv_dashboard_weekly_data;

  TRUNCATE public.mv_dashboard_project_stats;
  INSERT INTO public.mv_dashboard_project_stats (
    project_id, runs, completed, failed, decisions,
    aceitos, rejeitados, nao_aplicavel, acceptance_rate
  )
  SELECT
    project_id, runs, completed, failed, decisions,
    aceitos, rejeitados, nao_aplicavel, acceptance_rate
  FROM private.mv_dashboard_project_stats_data;

  TRUNCATE public.mv_dashboard_weekly;
  INSERT INTO public.mv_dashboard_weekly (
    project_id, week_start, runs, aceitos, rejeitados
  )
  SELECT project_id, week_start, runs, aceitos, rejeitados
  FROM private.mv_dashboard_weekly_data;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_dashboard_mviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_mviews() TO service_role;

-- Popula as tabelas na aplicação da migration.
SELECT public.refresh_dashboard_mviews();
