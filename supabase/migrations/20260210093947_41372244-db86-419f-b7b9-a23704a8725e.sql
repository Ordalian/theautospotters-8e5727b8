
-- Add location fields to cars table
ALTER TABLE public.cars ADD COLUMN latitude double precision;
ALTER TABLE public.cars ADD COLUMN longitude double precision;
ALTER TABLE public.cars ADD COLUMN location_name text;

-- Create a function to get leaderboard (counts cars per user with username)
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(user_id uuid, username text, avatar_url text, car_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.user_id, p.username, p.avatar_url, COUNT(c.id) as car_count
  FROM public.cars c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  GROUP BY c.user_id, p.username, p.avatar_url
  ORDER BY car_count DESC;
$$;
