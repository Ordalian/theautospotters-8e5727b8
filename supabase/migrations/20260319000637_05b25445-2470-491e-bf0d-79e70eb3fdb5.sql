CREATE OR REPLACE FUNCTION public.search_public_profiles(p_query text, p_limit integer DEFAULT 15)
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  role text,
  is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.avatar_url,
    p.role,
    p.is_premium
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id <> auth.uid()
    AND p.username IS NOT NULL
    AND p.username ILIKE '%' || COALESCE(p_query, '') || '%'
  ORDER BY p.username ASC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 15), 50));
$$;

CREATE OR REPLACE FUNCTION public.get_public_profiles_by_ids(p_user_ids uuid[])
RETURNS TABLE (
  user_id uuid,
  username text,
  avatar_url text,
  role text,
  is_premium boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.username,
    p.avatar_url,
    p.role,
    p.is_premium
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND p.user_id = ANY(COALESCE(p_user_ids, ARRAY[]::uuid[]));
$$;

GRANT EXECUTE ON FUNCTION public.search_public_profiles(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_profiles_by_ids(uuid[]) TO authenticated;