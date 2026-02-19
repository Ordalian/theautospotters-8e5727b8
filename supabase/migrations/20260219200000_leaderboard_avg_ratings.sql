-- Ensure rating columns exist (in case earlier migration was not run)
ALTER TABLE public.cars
  ADD COLUMN IF NOT EXISTS quality_rating integer DEFAULT 3,
  ADD COLUMN IF NOT EXISTS rarity_rating integer DEFAULT 5;

-- Extend leaderboard with average quality, average rarity, and "car level" (avg of both)
-- Must drop first because return type changed (PostgreSQL does not allow REPLACE when signature changes)
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(
  user_id uuid,
  username text,
  avatar_url text,
  car_count bigint,
  avg_quality numeric,
  avg_rarity numeric,
  car_level numeric
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
    ROUND(AVG(COALESCE(c.quality_rating, 3) + COALESCE(c.rarity_rating, 5))::numeric / 2, 2) AS car_level
  FROM public.cars c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  GROUP BY c.user_id, p.username, p.avatar_url
  ORDER BY car_count DESC;
$$;
