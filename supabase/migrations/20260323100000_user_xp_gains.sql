-- Table to log each XP gain for "last 6 XP" display in game zone.
CREATE TABLE IF NOT EXISTS public.user_xp_gains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  source text DEFAULT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_xp_gains_user_created
  ON public.user_xp_gains (user_id, created_at DESC);

ALTER TABLE public.user_xp_gains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own xp gains"
  ON public.user_xp_gains FOR SELECT
  USING (auth.uid() = user_id);

-- No INSERT/UPDATE/DELETE for users (only the RPC writes).
-- Service role / SECURITY DEFINER will bypass RLS.

-- Update increment_total_xp to log each gain (optional source).
CREATE OR REPLACE FUNCTION public.increment_total_xp(amount integer DEFAULT 1, source text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles
  SET total_xp = COALESCE(total_xp, 0) + amount
  WHERE user_id = auth.uid();

  INSERT INTO public.user_xp_gains (user_id, amount, source)
  VALUES (auth.uid(), amount, source);
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_total_xp(integer, text) TO authenticated;
