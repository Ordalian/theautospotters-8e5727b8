-- Daily boosters: store up to 3, with a 4th on a timer (12h).
-- stored_count 0-3, next_available_at = when next booster will be ready.

ALTER TABLE public.user_booster_cooldown
  ADD COLUMN IF NOT EXISTS stored_count integer NOT NULL DEFAULT 0 CHECK (stored_count >= 0 AND stored_count <= 3),
  ADD COLUMN IF NOT EXISTS next_available_at timestamptz;

-- Backfill: existing rows get next_available_at = last_opened_at + 12h
UPDATE public.user_booster_cooldown
SET next_available_at = last_opened_at + interval '12 hours'
WHERE next_available_at IS NULL;

-- New rows (first time): next_available_at defaults to now() + 12h when we first consume
-- So we leave next_available_at nullable; app will set it on first open.

-- Claim daily boosters: move time-based ready boosters into stored (max 3)
CREATE OR REPLACE FUNCTION public.claim_daily_boosters()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
  next_ts timestamptz;
BEGIN
  SELECT * INTO r FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  IF r IS NULL THEN
    INSERT INTO public.user_booster_cooldown (user_id, stored_count, next_available_at)
    VALUES (auth.uid(), 0, now() + interval '12 hours');
    RETURN jsonb_build_object('stored_count', 0, 'next_available_at', (now() + interval '12 hours')::text);
  END IF;

  next_ts := COALESCE(r.next_available_at, now() + interval '12 hours');
  WHILE now() >= next_ts AND (SELECT stored_count FROM public.user_booster_cooldown WHERE user_id = auth.uid()) < 3 LOOP
    UPDATE public.user_booster_cooldown
    SET stored_count = LEAST(3, stored_count + 1),
        next_available_at = next_ts + interval '12 hours'
    WHERE user_id = auth.uid();
    SELECT next_available_at INTO next_ts FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  END LOOP;

  SELECT stored_count, next_available_at INTO r FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'stored_count', r.stored_count,
    'next_available_at', r.next_available_at::text
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.claim_daily_boosters() TO authenticated;

-- Consume one daily booster (from stored or the "current" slot). Returns ok or error.
CREATE OR REPLACE FUNCTION public.consume_daily_booster()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  IF r IS NULL THEN
    INSERT INTO public.user_booster_cooldown (user_id, stored_count, next_available_at)
    VALUES (auth.uid(), 0, now() + interval '12 hours');
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF r.stored_count > 0 THEN
    UPDATE public.user_booster_cooldown SET stored_count = stored_count - 1 WHERE user_id = auth.uid();
    RETURN jsonb_build_object('ok', true);
  END IF;

  IF r.next_available_at IS NULL OR now() >= r.next_available_at THEN
    UPDATE public.user_booster_cooldown SET next_available_at = now() + interval '12 hours' WHERE user_id = auth.uid();
    RETURN jsonb_build_object('ok', true);
  END IF;

  RETURN jsonb_build_object('ok', false, 'error', 'no_daily_booster');
END;
$$;
GRANT EXECUTE ON FUNCTION public.consume_daily_booster() TO authenticated;
