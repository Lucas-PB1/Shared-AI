-- Fix RLS infinite recursion on project_members / profiles (dashboard auth).

-- ---------------------------------------------------------------------------
-- Owner check via SECURITY DEFINER (evita policy que relê project_members)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_project_owner(p_project_id uuid)
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
      AND m.role = 'owner'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_project_owner(uuid) TO authenticated;

DROP POLICY IF EXISTS members_manage_owner ON public.project_members;
CREATE POLICY members_manage_owner ON public.project_members
  FOR ALL TO authenticated
  USING (public.is_project_owner(project_id))
  WITH CHECK (public.is_project_owner(project_id));

-- ---------------------------------------------------------------------------
-- Visibilidade de profiles sem subquery RLS em project_members
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_profile_visible(p_profile_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_profile_id = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.project_members mine
      JOIN public.project_members peer
        ON peer.project_id = mine.project_id
      WHERE mine.user_id = auth.uid()
        AND peer.user_id = p_profile_id
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_profile_visible(uuid) TO authenticated;

DROP POLICY IF EXISTS profiles_select_project_peers ON public.profiles;
DROP POLICY IF EXISTS profiles_select_self ON public.profiles;
DROP POLICY IF EXISTS profiles_select_peers ON public.profiles;

CREATE POLICY profiles_select_visible ON public.profiles
  FOR SELECT TO authenticated
  USING (public.is_profile_visible(id));
