-- Memória evolutiva: liga decisions→findings e enriquece policy tables.

-- decisions: optional link to the comment/finding row
ALTER TABLE public.decisions
  ADD COLUMN IF NOT EXISTS finding_id uuid
    REFERENCES public.findings (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS decisions_finding_id_idx
  ON public.decisions (finding_id)
  WHERE finding_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS decisions_project_key_verdict_idx
  ON public.decisions (project_id, finding_key, verdict);

-- exclusions: occurrence count + provenance
ALTER TABLE public.exclusions
  ADD COLUMN IF NOT EXISTS occurrences integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source text;

-- conventions: stable theme key + occurrence (recurring aceito → policy)
ALTER TABLE public.conventions
  ADD COLUMN IF NOT EXISTS finding_key text,
  ADD COLUMN IF NOT EXISTS occurrences integer NOT NULL DEFAULT 1;

CREATE UNIQUE INDEX IF NOT EXISTS conventions_project_finding_key_uidx
  ON public.conventions (project_id, finding_key)
  WHERE finding_key IS NOT NULL;
