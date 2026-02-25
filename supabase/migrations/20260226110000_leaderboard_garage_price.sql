-- Add total_estimated_price to leaderboard (sum of estimated_price, excluding miniatures)
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  car_count bigint,
  avg_quality numeric,
  avg_rarity numeric,
  car_level numeric,
  total_estimated_price numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.user_id,
    p.username,
    p.avatar_url,
    COUNT(c.id)::bigint AS car_count,
    ROUND(AVG(COALESCE(c.quality_rating, 3))::numeric, 2) AS avg_quality,
    ROUND(AVG(COALESCE(c.rarity_rating, 5))::numeric, 2) AS avg_rarity,
    ROUND(AVG(COALESCE(c.quality_rating, 3) + COALESCE(c.rarity_rating, 5))::numeric / 2, 2) AS car_level,
    COALESCE(SUM(CASE WHEN c.vehicle_type IS DISTINCT FROM 'hot_wheels' AND c.estimated_price IS NOT NULL AND c.estimated_price > 0 THEN c.estimated_price ELSE 0 END), 0)::numeric AS total_estimated_price
  FROM public.cars c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  GROUP BY c.user_id, p.username, p.avatar_url
  ORDER BY car_count DESC;
$$;
