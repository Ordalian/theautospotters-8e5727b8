
-- Step 2: Update functions with new columns
DROP FUNCTION IF EXISTS public.get_users_for_admin();
DROP FUNCTION IF EXISTS public.get_users_search(text);

CREATE FUNCTION public.get_users_for_admin()
RETURNS TABLE(user_id uuid, email text, username text, role text, is_premium boolean, is_map_marker boolean, created_at timestamptz, car_count bigint, flagged_for_deletion boolean, flagged_by uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id, u.email::text, p.username, p.role, p.is_premium,
    COALESCE(p.is_map_marker, false), p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id),
    COALESCE(p.flagged_for_deletion, false), p.flagged_by
  FROM profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  ORDER BY p.created_at DESC;
$$;

CREATE FUNCTION public.get_users_search(p_query text)
RETURNS TABLE(user_id uuid, email text, username text, role text, is_premium boolean, is_map_marker boolean, created_at timestamptz, car_count bigint, flagged_for_deletion boolean, flagged_by uuid)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id, u.email::text, p.username, p.role, p.is_premium,
    COALESCE(p.is_map_marker, false), p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id),
    COALESCE(p.flagged_for_deletion, false), p.flagged_by
  FROM profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  AND trim(COALESCE(p_query, '')) <> ''
  AND (p.username ILIKE '%' || trim(p_query) || '%' OR u.email::text ILIKE '%' || trim(p_query) || '%')
  ORDER BY p.username NULLS LAST, u.email LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_flagged_users()
RETURNS TABLE(user_id uuid, email text, username text, role text, is_premium boolean, is_map_marker boolean, created_at timestamptz, car_count bigint, flagged_by uuid, flagger_username text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id, u.email::text, p.username, p.role, p.is_premium,
    COALESCE(p.is_map_marker, false), p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id),
    p.flagged_by,
    (SELECT pp.username FROM profiles pp WHERE pp.user_id = p.flagged_by)
  FROM profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE p.flagged_for_deletion = true
  AND (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  ORDER BY p.created_at DESC;
$$;
