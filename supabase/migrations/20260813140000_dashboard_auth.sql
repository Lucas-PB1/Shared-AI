-- Dashboard multi-user: profiles sync, claim owner, auto-owner on project create.

-- ---------------------------------------------------------------------------
-- profiles: espelho automático de auth.users
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'display_name',
      split_part(COALESCE(NEW.email, 'user'), '@', 1)
    )
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        display_name = COALESCE(public.profiles.display_name, EXCLUDED.display_name);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ---------------------------------------------------------------------------
-- claim_project_owner — bootstrap quando o projeto ainda não tem membros
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.claim_project_owner(p_project_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_count integer;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT COUNT(*)::integer INTO v_count
  FROM public.project_members
  WHERE project_id = p_project_id;

  IF v_count > 0 THEN
    RAISE EXCEPTION 'project already has members';
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = v_uid
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (p_project_id, v_uid, 'owner');
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_project_owner(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- Auto-owner ao criar projeto (dashboard)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_project_owner()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.profiles (id, email, display_name)
  SELECT u.id, u.email, COALESCE(u.raw_user_meta_data ->> 'display_name', split_part(u.email, '@', 1))
  FROM auth.users u
  WHERE u.id = v_uid
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (NEW.id, v_uid, 'owner')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_project_created_owner ON public.projects;
CREATE TRIGGER on_project_created_owner
  AFTER INSERT ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_project_owner();

-- ---------------------------------------------------------------------------
-- Listar projetos sem membros (para claim na UI) — só ids/slugs públicos mínimos
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_unclaimed_projects()
RETURNS TABLE (
  id uuid,
  slug text,
  name text,
  github_owner text,
  github_repo text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.slug, p.name, p.github_owner, p.github_repo
  FROM public.projects p
  WHERE NOT EXISTS (
    SELECT 1 FROM public.project_members m WHERE m.project_id = p.id
  )
  ORDER BY p.name;
$$;

GRANT EXECUTE ON FUNCTION public.list_unclaimed_projects() TO authenticated;

-- ---------------------------------------------------------------------------
-- Invite por e-mail (owner): resolve profile por email e adiciona member
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.invite_project_member(
  p_project_id uuid,
  p_email text,
  p_role public.member_role DEFAULT 'member'
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_target uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.project_members m
    WHERE m.project_id = p_project_id
      AND m.user_id = v_uid
      AND m.role = 'owner'
  ) THEN
    RAISE EXCEPTION 'only owners can invite';
  END IF;

  IF p_role = 'owner' THEN
    RAISE EXCEPTION 'cannot invite as owner via this function';
  END IF;

  SELECT pr.id INTO v_target
  FROM public.profiles pr
  WHERE lower(pr.email) = lower(trim(p_email))
  LIMIT 1;

  IF v_target IS NULL THEN
    RAISE EXCEPTION 'user not found — peça para a pessoa criar conta primeiro';
  END IF;

  INSERT INTO public.project_members (project_id, user_id, role)
  VALUES (p_project_id, v_target, p_role)
  ON CONFLICT (project_id, user_id) DO UPDATE
    SET role = EXCLUDED.role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.invite_project_member(uuid, text, public.member_role) TO authenticated;

-- ---------------------------------------------------------------------------
-- profiles: membros do mesmo projeto podem ver display_name/email uns dos outros
-- ---------------------------------------------------------------------------
CREATE POLICY profiles_select_project_peers ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.project_members mine
      JOIN public.project_members peer
        ON peer.project_id = mine.project_id
      WHERE mine.user_id = auth.uid()
        AND peer.user_id = profiles.id
    )
  );

DROP POLICY IF EXISTS profiles_select_self ON public.profiles;

