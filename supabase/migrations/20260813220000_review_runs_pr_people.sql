-- review_runs: autor do PR e avaliadores como colunas tipadas (não só meta jsonb).
-- Política: memória canônica = source = ci (remove runs de teste local/agent/etc.).

ALTER TABLE public.review_runs
  ADD COLUMN IF NOT EXISTS pr_author text,
  ADD COLUMN IF NOT EXISTS pr_author_is_bot boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reviewers text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.review_runs.pr_author IS
  'Login GitHub de quem abriu o PR (ingest CI / backfill).';
COMMENT ON COLUMN public.review_runs.reviewers IS
  'Logins humanos que avaliaram (reviews + replies no thread), sem o autor do PR.';

CREATE INDEX IF NOT EXISTS review_runs_pr_author_idx
  ON public.review_runs (pr_author)
  WHERE pr_author IS NOT NULL;

-- Promove dados já gravados em meta (backfill anterior / ingest).
UPDATE public.review_runs
SET
  pr_author = COALESCE(
    NULLIF(BTRIM(pr_author), ''),
    NULLIF(BTRIM(meta ->> 'pr_author'), '')
  ),
  pr_author_is_bot = COALESCE(
    CASE
      WHEN meta ? 'pr_author_is_bot' THEN (meta ->> 'pr_author_is_bot')::boolean
      ELSE NULL
    END,
    pr_author_is_bot
  ),
  reviewers = CASE
    WHEN cardinality(reviewers) > 0 THEN reviewers
    WHEN jsonb_typeof(meta -> 'reviewers') = 'array' THEN ARRAY(
      SELECT jsonb_array_elements_text(meta -> 'reviewers')
    )
    ELSE reviewers
  END;

-- Histórico conhecido hostdime-hub (se ainda vazio após promove-de-meta).
UPDATE public.review_runs rr
SET
  pr_author = COALESCE(NULLIF(BTRIM(rr.pr_author), ''), 'matheusv-spec'),
  pr_author_is_bot = false,
  reviewers = CASE
    WHEN cardinality(rr.reviewers) > 0 THEN rr.reviewers
    ELSE ARRAY['lucas-hdbr']::text[]
  END
FROM public.projects p
WHERE
  rr.project_id = p.id
  AND p.slug = 'hostdime-hub'
  AND rr.pr_number = 69
  AND rr.source = 'ci';

UPDATE public.review_runs rr
SET
  pr_author = COALESCE(NULLIF(BTRIM(rr.pr_author), ''), 'antonioq-hd'),
  pr_author_is_bot = false,
  reviewers = CASE
    WHEN cardinality(rr.reviewers) > 0 THEN rr.reviewers
    ELSE ARRAY['lucas-hdbr']::text[]
  END
FROM public.projects p
WHERE
  rr.project_id = p.id
  AND p.slug = 'hostdime-hub'
  AND rr.pr_number = 68
  AND rr.source = 'ci';

-- Espelha colunas de volta ao meta (compat UI antiga / sync).
UPDATE public.review_runs
SET meta = meta
  || jsonb_strip_nulls(
    jsonb_build_object(
      'pr_author', pr_author,
      'pr_author_is_bot', pr_author_is_bot,
      'reviewers', to_jsonb(reviewers)
    )
  )
WHERE pr_author IS NOT NULL OR cardinality(reviewers) > 0;

-- Só CI permanece como memória canônica (cascata em findings).
DELETE FROM public.review_runs
WHERE source IS DISTINCT FROM 'ci';
