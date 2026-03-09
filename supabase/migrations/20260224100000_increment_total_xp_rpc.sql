-- Atomic XP increment (e.g. +20 when linking spot to miniature).
-- Use: SELECT * FROM increment_total_xp(20);
CREATE OR REPLACE FUNCTION public.increment_total_xp(amount integer DEFAULT 1)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.profiles
  SET total_xp = COALESCE(total_xp, 0) + amount
  WHERE user_id = auth.uid();
$$;

-- Allow authenticated users to call for themselves (only their row is updated via auth.uid())
GRANT EXECUTE ON FUNCTION public.increment_total_xp(integer) TO authenticated;
