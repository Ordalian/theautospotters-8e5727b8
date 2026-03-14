-- Fix admin panel counters: include founder in admin count; ensure RPC returns one row for admins.

CREATE OR REPLACE FUNCTION public.get_admin_role_counts()
RETURNS TABLE (admin_count bigint, map_marker_count bigint, premium_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM profiles WHERE role IN ('admin', 'founder')) AS admin_count,
    (SELECT count(*) FROM profiles WHERE is_map_marker = true) AS map_marker_count,
    (SELECT count(*) FROM profiles WHERE is_premium = true) AS premium_count
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin');
$$;
