-- Founder is map maker by default; users can be both admin and map maker (is_map_marker flag).
-- Add is_map_marker to profiles; update POI/storage policies; add search + role counts for admin UI.

-- 1. Add is_map_marker to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_map_marker boolean NOT NULL DEFAULT false;

-- 2. Founder is map maker by default; migrate existing map_marker role to flag
UPDATE profiles SET is_map_marker = true WHERE role = 'founder';
UPDATE profiles SET role = 'user', is_map_marker = true WHERE role = 'map_marker';

-- 3. Expose is_map_marker in public view
DROP VIEW IF EXISTS profiles_public;
CREATE VIEW profiles_public AS
  SELECT
    user_id,
    username,
    avatar_url,
    created_at,
    pinned_car_id,
    total_xp,
    emblem_slot_1,
    emblem_slot_2,
    emblem_slot_3,
    role,
    is_premium,
    is_map_marker
  FROM profiles;

-- 4. Admin can update is_map_marker and is_premium for user profiles (not role)
CREATE POLICY "Admin can update map_marker and premium for users"
  ON profiles FOR UPDATE
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) = 'admin'
    AND profiles.role = 'user'
  )
  WITH CHECK (profiles.role = 'user');

-- 5. Update POI policies: (admin/founder) OR is_map_marker
DROP POLICY IF EXISTS "Map marker and staff can insert POIs" ON public.map_pois;
DROP POLICY IF EXISTS "Map marker and staff can update POIs" ON public.map_pois;
DROP POLICY IF EXISTS "Map marker and staff can delete POIs" ON public.map_pois;

CREATE POLICY "Map marker and staff can insert POIs"
  ON public.map_pois FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('admin', 'founder')
    OR (SELECT p.is_map_marker FROM profiles p WHERE p.user_id = auth.uid()) = true
  );

CREATE POLICY "Map marker and staff can update POIs"
  ON public.map_pois FOR UPDATE TO authenticated
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('admin', 'founder')
    OR (SELECT p.is_map_marker FROM profiles p WHERE p.user_id = auth.uid()) = true
  )
  WITH CHECK (true);

CREATE POLICY "Map marker and staff can delete POIs"
  ON public.map_pois FOR DELETE TO authenticated
  USING (
    (SELECT p.role FROM profiles p WHERE p.user_id = auth.uid()) IN ('admin', 'founder')
    OR (SELECT p.is_map_marker FROM profiles p WHERE p.user_id = auth.uid()) = true
  );

-- 6. Update storage helper and policies
CREATE OR REPLACE FUNCTION public.user_can_manage_pois()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid()
    AND (p.role IN ('admin', 'founder') OR p.is_map_marker = true)
  );
$$;

-- 7. get_users_for_admin: add is_map_marker
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

-- 8. Search users by name or email (for admin UI)
CREATE OR REPLACE FUNCTION get_users_search(p_query text)
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
  AND (p.username ILIKE '%' || trim(p_query) || '%' OR u.email::text ILIKE '%' || trim(p_query) || '%')
  ORDER BY p.username NULLS LAST, u.email
  LIMIT 50;
$$;

-- 9. Role counts for admin tiles
CREATE OR REPLACE FUNCTION get_admin_role_counts()
RETURNS TABLE (admin_count bigint, map_marker_count bigint, premium_count bigint)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM profiles WHERE role = 'admin') AS admin_count,
    (SELECT count(*) FROM profiles WHERE is_map_marker = true) AS map_marker_count,
    (SELECT count(*) FROM profiles WHERE is_premium = true) AS premium_count
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin');
$$;
