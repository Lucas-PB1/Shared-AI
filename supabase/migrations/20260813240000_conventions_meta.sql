-- conventions.meta: absorbed finding keys, LLM promote, superseded_by
ALTER TABLE public.conventions
  ADD COLUMN IF NOT EXISTS meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.conventions.meta IS
  'Policy metadata: absorbed_finding_keys, llm_promoted, superseded_by';
