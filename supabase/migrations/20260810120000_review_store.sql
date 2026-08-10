-- Store unificado de code-review (local → cloud Supabase).
-- Apenas DDL: sem dados de clientes no repositório.

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
CREATE TYPE public.review_source AS ENUM ('local', 'ci', 'pre_commit', 'agent');
CREATE TYPE public.review_run_status AS ENUM ('running', 'completed', 'failed', 'cancelled');
CREATE TYPE public.decision_verdict AS ENUM ('aceito', 'rejeitado', 'nao-aplicavel');
CREATE TYPE public.member_role AS ENUM ('owner', 'member', 'viewer');

-- ---------------------------------------------------------------------------
-- projects — um row por repositório / sistema
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  github_owner text,
  github_repo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT projects_slug_format CHECK (slug ~ '^[a-z0-9][a-z0-9._/-]*$')
);

CREATE INDEX projects_github_idx ON public.projects (github_owner, github_repo);

-- ---------------------------------------------------------------------------
-- profiles — espelho de auth.users (multi-usuário)
-- ---------------------------------------------------------------------------
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  display_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- project_members — ACL por projeto
-- ---------------------------------------------------------------------------
CREATE TABLE public.project_members (
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles (id) ON DELETE CASCADE,
  role public.member_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (project_id, user_id)
);

CREATE INDEX project_members_user_idx ON public.project_members (user_id);

-- ---------------------------------------------------------------------------
-- review_runs — execução local, CI ou pre-commit
-- ---------------------------------------------------------------------------
CREATE TABLE public.review_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  source public.review_source NOT NULL,
  status public.review_run_status NOT NULL DEFAULT 'running',
  actor_kind text NOT NULL DEFAULT 'human',
  actor_ref text,
  git_sha text,
  branch text,
  pr_number integer,
  review_slug text,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT review_runs_pr_positive CHECK (pr_number IS NULL OR pr_number > 0)
);

CREATE INDEX review_runs_project_started_idx
  ON public.review_runs (project_id, started_at DESC);
CREATE INDEX review_runs_project_pr_idx
  ON public.review_runs (project_id, pr_number)
  WHERE pr_number IS NOT NULL;

-- ---------------------------------------------------------------------------
-- findings — achados (podem conter trechos de código → NÃO exportar ao git)
-- ---------------------------------------------------------------------------
CREATE TABLE public.findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.review_runs (id) ON DELETE CASCADE,
  finding_key text NOT NULL,
  file_path text,
  line_start integer,
  line_end integer,
  severity text,
  category text,
  summary text NOT NULL,
  body text,
  de_code text,
  para_code text,
  meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX findings_run_idx ON public.findings (run_id);
CREATE INDEX findings_key_idx ON public.findings (finding_key);

-- ---------------------------------------------------------------------------
-- decisions — veredito humano/LLM; fonte de verdade (unificação hard)
-- ---------------------------------------------------------------------------
CREATE TABLE public.decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  run_id uuid REFERENCES public.review_runs (id) ON DELETE SET NULL,
  finding_key text NOT NULL,
  verdict public.decision_verdict NOT NULL,
  reason text,
  decided_by text,
  source text,
  file_path text,
  summary text,
  schema_version text NOT NULL DEFAULT '1',
  finalized_at timestamptz NOT NULL DEFAULT now(),
  meta jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX decisions_project_key_idx
  ON public.decisions (project_id, finding_key);
CREATE INDEX decisions_project_finalized_idx
  ON public.decisions (project_id, finalized_at DESC);

-- ---------------------------------------------------------------------------
-- exclusions — política exportável (sem snippet de código)
-- ---------------------------------------------------------------------------
CREATE TABLE public.exclusions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  finding_key text NOT NULL,
  reason text NOT NULL DEFAULT '',
  scope_glob text NOT NULL DEFAULT '**/*',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (project_id, finding_key, scope_glob)
);

-- ---------------------------------------------------------------------------
-- conventions — bullets por escopo (substituto de partes de convencoes.md)
-- ---------------------------------------------------------------------------
CREATE TABLE public.conventions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects (id) ON DELETE CASCADE,
  scope_glob text NOT NULL DEFAULT '**/*',
  body text NOT NULL,
  source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX conventions_project_scope_idx
  ON public.conventions (project_id, scope_glob);

-- ---------------------------------------------------------------------------
-- Helpers RLS
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_member(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members m
    WHERE m.project_id = p_project_id
      AND m.user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_project_writer(p_project_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_members m
    WHERE m.project_id = p_project_id
      AND m.user_id = auth.uid()
      AND m.role IN ('owner', 'member')
  );
$$;

-- ---------------------------------------------------------------------------
-- RLS
-- service_role bypassa RLS (CLI local e CI com service key).
-- authenticated: só membros do projeto.
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exclusions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conventions ENABLE ROW LEVEL SECURITY;

-- profiles: usuário lê/atualiza a si
CREATE POLICY profiles_select_self ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY profiles_update_self ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY profiles_insert_self ON public.profiles
  FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

-- projects
CREATE POLICY projects_select_member ON public.projects
  FOR SELECT TO authenticated
  USING (public.is_project_member(id));

CREATE POLICY projects_insert_authenticated ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY projects_update_writer ON public.projects
  FOR UPDATE TO authenticated
  USING (public.is_project_writer(id))
  WITH CHECK (public.is_project_writer(id));

-- members
CREATE POLICY members_select ON public.project_members
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id) OR user_id = auth.uid());

CREATE POLICY members_manage_owner ON public.project_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_members m
      WHERE m.project_id = project_members.project_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_members m
      WHERE m.project_id = project_members.project_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
    )
  );

-- review_runs
CREATE POLICY runs_select ON public.review_runs
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY runs_write ON public.review_runs
  FOR ALL TO authenticated
  USING (public.is_project_writer(project_id))
  WITH CHECK (public.is_project_writer(project_id));

-- findings (via run → project)
CREATE POLICY findings_select ON public.findings
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.review_runs r
      WHERE r.id = findings.run_id
        AND public.is_project_member(r.project_id)
    )
  );

CREATE POLICY findings_write ON public.findings
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.review_runs r
      WHERE r.id = findings.run_id
        AND public.is_project_writer(r.project_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.review_runs r
      WHERE r.id = findings.run_id
        AND public.is_project_writer(r.project_id)
    )
  );

-- decisions / exclusions / conventions
CREATE POLICY decisions_select ON public.decisions
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY decisions_write ON public.decisions
  FOR ALL TO authenticated
  USING (public.is_project_writer(project_id))
  WITH CHECK (public.is_project_writer(project_id));

CREATE POLICY exclusions_select ON public.exclusions
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY exclusions_write ON public.exclusions
  FOR ALL TO authenticated
  USING (public.is_project_writer(project_id))
  WITH CHECK (public.is_project_writer(project_id));

CREATE POLICY conventions_select ON public.conventions
  FOR SELECT TO authenticated
  USING (public.is_project_member(project_id));

CREATE POLICY conventions_write ON public.conventions
  FOR ALL TO authenticated
  USING (public.is_project_writer(project_id))
  WITH CHECK (public.is_project_writer(project_id));

-- ---------------------------------------------------------------------------
-- Grants (PostgREST)
-- service_role e authenticated: I/O do store. anon: sem acesso a dados.
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO authenticated, service_role;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated, service_role;
