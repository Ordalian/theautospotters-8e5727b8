
-- Function: get users with activity for admin all-users list
CREATE OR REPLACE FUNCTION public.get_users_with_activity(p_sort text DEFAULT 'newest', p_query text DEFAULT '')
RETURNS TABLE(
  user_id uuid,
  username text,
  email text,
  role text,
  is_premium boolean,
  created_at timestamptz,
  car_count bigint,
  total_time_ms bigint,
  total_views bigint,
  total_features bigint
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    p.user_id,
    p.username,
    u.email::text,
    p.role,
    p.is_premium,
    p.created_at,
    (SELECT count(*) FROM cars c WHERE c.user_id = p.user_id) AS car_count,
    COALESCE((SELECT sum(pv.duration_ms) FROM page_views pv WHERE pv.user_id = p.user_id), 0)::bigint AS total_time_ms,
    COALESCE((SELECT count(*) FROM page_views pv WHERE pv.user_id = p.user_id), 0)::bigint AS total_views,
    COALESCE((SELECT count(*) FROM feature_usage fu WHERE fu.user_id = p.user_id), 0)::bigint AS total_features
  FROM profiles p
  JOIN auth.users u ON u.id = p.user_id
  WHERE (SELECT pr.role FROM profiles pr WHERE pr.user_id = auth.uid()) IN ('founder', 'admin')
  AND (
    trim(COALESCE(p_query, '')) = ''
    OR p.username ILIKE '%' || trim(p_query) || '%'
    OR u.email::text ILIKE '%' || trim(p_query) || '%'
  )
  ORDER BY
    CASE WHEN p_sort = 'newest' THEN extract(epoch from p.created_at) END DESC NULLS LAST,
    CASE WHEN p_sort = 'oldest' THEN extract(epoch from p.created_at) END ASC NULLS LAST,
    CASE WHEN p_sort = 'activity' THEN COALESCE((SELECT count(*) FROM page_views pv2 WHERE pv2.user_id = p.user_id), 0) + COALESCE((SELECT count(*) FROM feature_usage fu2 WHERE fu2.user_id = p.user_id), 0) END DESC NULLS LAST
  LIMIT 100;
$$;

-- Function: get single user activity detail
CREATE OR REPLACE FUNCTION public.get_user_activity_detail(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  pages jsonb;
  hours jsonb;
  features jsonb;
  total_ms bigint;
  uname text;
  uemail text;
  urole text;
  ucreated timestamptz;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.user_id = auth.uid() AND pr.role IN ('founder', 'admin')) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT p.username, u.email::text, p.role, p.created_at
  INTO uname, uemail, urole, ucreated
  FROM profiles p JOIN auth.users u ON u.id = p.user_id
  WHERE p.user_id = p_user_id;

  SELECT COALESCE(sum(duration_ms), 0)::bigint INTO total_ms
  FROM page_views WHERE user_id = p_user_id;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO pages
  FROM (
    SELECT page, count(*) as visit_count, COALESCE(sum(duration_ms), 0)::bigint as total_duration_ms
    FROM page_views WHERE user_id = p_user_id
    GROUP BY page ORDER BY visit_count DESC LIMIT 20
  ) sub;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO hours
  FROM (
    SELECT extract(hour from entered_at)::int as hour, count(*) as visit_count
    FROM page_views WHERE user_id = p_user_id
    GROUP BY hour ORDER BY hour
  ) sub;

  SELECT COALESCE(jsonb_agg(row_to_json(sub)), '[]'::jsonb) INTO features
  FROM (
    SELECT feature, count(*) as use_count
    FROM feature_usage WHERE user_id = p_user_id
    GROUP BY feature ORDER BY use_count DESC LIMIT 20
  ) sub;

  RETURN jsonb_build_object(
    'username', uname,
    'email', uemail,
    'role', urole,
    'created_at', ucreated,
    'total_time_ms', total_ms,
    'pages', pages,
    'hours', hours,
    'features', features
  );
END;
$$;

-- Function: get global activity overview for stats tile
CREATE OR REPLACE FUNCTION public.get_activity_overview()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  total_time bigint;
  avg_time_per_user bigint;
  total_views bigint;
  active_users bigint;
  peak_hour int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM profiles pr WHERE pr.user_id = auth.uid() AND pr.role IN ('founder', 'admin')) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  SELECT COALESCE(sum(duration_ms), 0)::bigint INTO total_time FROM page_views;
  SELECT count(DISTINCT user_id)::bigint INTO active_users FROM page_views;
  SELECT count(*)::bigint INTO total_views FROM page_views;

  IF active_users > 0 THEN
    avg_time_per_user := total_time / active_users;
  ELSE
    avg_time_per_user := 0;
  END IF;

  SELECT extract(hour from entered_at)::int INTO peak_hour
  FROM page_views
  GROUP BY extract(hour from entered_at)::int
  ORDER BY count(*) DESC LIMIT 1;

  RETURN jsonb_build_object(
    'total_time_ms', total_time,
    'avg_time_per_user_ms', avg_time_per_user,
    'total_views', total_views,
    'active_users', active_users,
    'peak_hour', COALESCE(peak_hour, 0)
  );
END;
$$;
