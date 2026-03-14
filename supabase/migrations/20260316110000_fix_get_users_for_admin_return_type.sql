-- Fix: cannot change return type of existing function.
-- Ensure is_map_marker exists (in case this runs without 20260316100000).
-- Run this entire file from top to bottom so the column is created before the function.
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_map_marker boolean NOT NULL DEFAULT false;
-- Drop then recreate get_users_for_admin so we can add is_map_marker to the return type.
DROP FUNCTION IF EXISTS get_users_for_admin();
CREATE OR REPLACE FUNCTION get_users_for_admin()
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  role text,
  is_premium boolean,
  is_map_marker boolean,
  created_at timestamptz,
  car_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    p.username,
    p.role,
    p.is_premium,
    COALESCE(p.is_map_marker, false),
    p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id) AS car_count
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  ORDER BY p.created_at DESC;
$$;

-- Also ensure get_users_search exists (admin user search)
CREATE OR REPLACE FUNCTION public.get_users_search(p_query text)
RETURNS TABLE (
  user_id uuid,
  email text,
  username text,
  role text,
  is_premium boolean,
  is_map_marker boolean,
  created_at timestamptz,
  car_count bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    u.email::text,
    p.username,
    p.role,
    p.is_premium,
    COALESCE(p.is_map_marker, false),
    p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id) AS car_count
  FROM public.profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE (SELECT pr.role FROM public.profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  AND trim(COALESCE(p_query, '')) <> ''
  AND (p.username ILIKE '%' || trim(p_query) || '%' OR u.email::text ILIKE '%' || trim(p_query) || '%')
  ORDER BY p.username NULLS LAST, u.email
  LIMIT 50;
$$;
