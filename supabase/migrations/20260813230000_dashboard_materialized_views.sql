-- Dashboard: Materialized Views pré-agregadas (sem Nest/Redis).
-- Leitura rápida na app; refresh via RPC nos writers (ingest / sync).

-- ---------------------------------------------------------------------------
-- mv_dashboard_project_stats — uma linha por projeto
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.mv_dashboard_project_stats AS
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

CREATE UNIQUE INDEX mv_dashboard_project_stats_project_id_uidx
  ON public.mv_dashboard_project_stats (project_id);

COMMENT ON MATERIALIZED VIEW public.mv_dashboard_project_stats IS
  'KPIs de dashboard por projeto (runs CI + decisões github-pr). Refresh via refresh_dashboard_mviews().';

-- ---------------------------------------------------------------------------
-- mv_dashboard_weekly — (project_id, week_start UTC segunda)
-- ---------------------------------------------------------------------------
CREATE MATERIALIZED VIEW public.mv_dashboard_weekly AS
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

CREATE UNIQUE INDEX mv_dashboard_weekly_project_week_uidx
  ON public.mv_dashboard_weekly (project_id, week_start);

COMMENT ON MATERIALIZED VIEW public.mv_dashboard_weekly IS
  'Série semanal (UTC, semana ISO) de runs CI e vereditos. Refresh via refresh_dashboard_mviews().';

-- ---------------------------------------------------------------------------
-- Refresh RPC — service_role / ingest / sync
-- CONCURRENTLY não roda dentro de transação (PostgREST RPC); refresh simples.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.refresh_dashboard_mviews()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW public.mv_dashboard_project_stats;
  REFRESH MATERIALIZED VIEW public.mv_dashboard_weekly;
END;
$$;

REVOKE ALL ON FUNCTION public.refresh_dashboard_mviews() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.refresh_dashboard_mviews() TO service_role;

GRANT SELECT ON public.mv_dashboard_project_stats TO authenticated, service_role;
GRANT SELECT ON public.mv_dashboard_weekly TO authenticated, service_role;
