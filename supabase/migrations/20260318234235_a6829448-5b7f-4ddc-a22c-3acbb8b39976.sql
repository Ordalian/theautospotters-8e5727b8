
-- Fix: Allow any authenticated user to send a DM (not just friends)
-- This enables the "conversation request" flow for non-friends
DROP POLICY IF EXISTS "Users can send DMs to friends" ON public.direct_messages;

CREATE POLICY "Users can send DMs"
  ON public.direct_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND NOT is_blacklisted(auth.uid(), receiver_id)
  );

-- Create comprehensive analytics function for admin dashboard
CREATE OR REPLACE FUNCTION public.get_admin_analytics(p_days integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  result jsonb;
  dau jsonb;
  new_users jsonb;
  retention_7d numeric;
  retention_30d numeric;
  feature_adoption jsonb;
  daily_spots jsonb;
  daily_dms jsonb;
  total_users_count bigint;
  wau_count bigint;
  mau_count bigint;
BEGIN
  -- Only staff
  IF NOT is_staff(auth.uid()) THEN
    RETURN jsonb_build_object('error', 'unauthorized');
  END IF;

  -- Total users
  SELECT count(*) INTO total_users_count FROM profiles;

  -- WAU (7 days)
  SELECT count(DISTINCT user_id) INTO wau_count
  FROM page_views WHERE entered_at >= now() - interval '7 days';

  -- MAU (30 days)
  SELECT count(DISTINCT user_id) INTO mau_count
  FROM page_views WHERE entered_at >= now() - interval '30 days';

  -- DAU time series
  SELECT COALESCE(jsonb_agg(row_to_json(sub) ORDER BY sub.day), '[]'::jsonb) INTO dau
  FROM (
    SELECT date_trunc('day', entered_at)::date AS day, count(DISTINCT user_id) AS active_users
    FROM page_views
    WHERE entered_at >= now() - (p_days || ' days')::interval
    GROUP BY 1 ORDER BY 1
  ) sub;

  -- New signups per day
  SELECT COALESCE(jsonb_agg(row_to_json(sub) ORDER BY sub.day), '[]'::jsonb) INTO new_users
  FROM (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS signups
    FROM profiles
    WHERE created_at >= now() - (p_days || ' days')::interval
    GROUP BY 1 ORDER BY 1
  ) sub;

  -- Spots per day
  SELECT COALESCE(jsonb_agg(row_to_json(sub) ORDER BY sub.day), '[]'::jsonb) INTO daily_spots
  FROM (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS spots
    FROM cars
    WHERE created_at >= now() - (p_days || ' days')::interval
      AND vehicle_type IS DISTINCT FROM 'hot_wheels'
    GROUP BY 1 ORDER BY 1
  ) sub;

  -- DMs per day
  SELECT COALESCE(jsonb_agg(row_to_json(sub) ORDER BY sub.day), '[]'::jsonb) INTO daily_dms
  FROM (
    SELECT date_trunc('day', created_at)::date AS day, count(*) AS messages
    FROM direct_messages
    WHERE created_at >= now() - (p_days || ' days')::interval
    GROUP BY 1 ORDER BY 1
  ) sub;

  -- 7-day retention: users who signed up 8-14 days ago and came back in last 7 days
  SELECT COALESCE(
    ROUND(
      count(DISTINCT CASE WHEN pv.user_id IS NOT NULL THEN p.user_id END)::numeric
      / NULLIF(count(DISTINCT p.user_id), 0) * 100, 1
    ), 0
  ) INTO retention_7d
  FROM profiles p
  LEFT JOIN page_views pv ON pv.user_id = p.user_id AND pv.entered_at >= now() - interval '7 days'
  WHERE p.created_at BETWEEN now() - interval '14 days' AND now() - interval '7 days';

  -- 30-day retention: users who signed up 31-60 days ago and came back in last 30 days
  SELECT COALESCE(
    ROUND(
      count(DISTINCT CASE WHEN pv.user_id IS NOT NULL THEN p.user_id END)::numeric
      / NULLIF(count(DISTINCT p.user_id), 0) * 100, 1
    ), 0
  ) INTO retention_30d
  FROM profiles p
  LEFT JOIN page_views pv ON pv.user_id = p.user_id AND pv.entered_at >= now() - interval '30 days'
  WHERE p.created_at BETWEEN now() - interval '60 days' AND now() - interval '30 days';

  -- Feature adoption: % of active users (last 30 days) who used each feature
  SELECT COALESCE(jsonb_agg(row_to_json(sub) ORDER BY sub.adoption_pct DESC), '[]'::jsonb) INTO feature_adoption
  FROM (
    SELECT
      fu.feature,
      count(DISTINCT fu.user_id) AS unique_users,
      count(*) AS total_uses,
      ROUND(count(DISTINCT fu.user_id)::numeric / NULLIF(mau_count, 0) * 100, 1) AS adoption_pct
    FROM feature_usage fu
    WHERE fu.used_at >= now() - interval '30 days'
    GROUP BY fu.feature
    ORDER BY adoption_pct DESC
    LIMIT 20
  ) sub;

  result := jsonb_build_object(
    'total_users', total_users_count,
    'wau', wau_count,
    'mau', mau_count,
    'retention_7d', retention_7d,
    'retention_30d', retention_30d,
    'dau', dau,
    'new_users', new_users,
    'daily_spots', daily_spots,
    'daily_dms', daily_dms,
    'feature_adoption', feature_adoption
  );

  RETURN result;
END;
$$;
