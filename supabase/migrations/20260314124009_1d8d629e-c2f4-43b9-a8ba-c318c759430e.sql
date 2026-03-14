
-- Add premium_until to profiles (nullable = not premium or expired)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS premium_until timestamptz DEFAULT NULL;

-- Create spotter_usage table to track daily AutoSpotter uses
CREATE TABLE IF NOT EXISTS public.spotter_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  used_at timestamptz NOT NULL DEFAULT now(),
  usage_date date NOT NULL DEFAULT CURRENT_DATE
);

ALTER TABLE public.spotter_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own spotter usage" ON public.spotter_usage
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own spotter usage" ON public.spotter_usage
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Index for fast daily count lookups
CREATE INDEX IF NOT EXISTS idx_spotter_usage_user_date ON public.spotter_usage (user_id, usage_date);

-- Function to use autospotter (checks limits, deducts coins if needed)
CREATE OR REPLACE FUNCTION public.use_autospotter()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  p_premium boolean;
  p_premium_until timestamptz;
  today_count int;
  my_coins int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT is_premium, premium_until, coins INTO p_premium, p_premium_until, my_coins
  FROM public.profiles WHERE user_id = uid;

  -- Check if premium is active
  IF p_premium AND (p_premium_until IS NULL OR p_premium_until > now()) THEN
    -- Premium: unlimited, just record usage
    INSERT INTO public.spotter_usage (user_id, usage_date) VALUES (uid, CURRENT_DATE);
    RETURN jsonb_build_object('ok', true, 'free', true, 'premium', true);
  END IF;

  -- Count today's uses
  SELECT COUNT(*) INTO today_count
  FROM public.spotter_usage
  WHERE user_id = uid AND usage_date = CURRENT_DATE;

  IF today_count < 5 THEN
    -- Free use
    INSERT INTO public.spotter_usage (user_id, usage_date) VALUES (uid, CURRENT_DATE);
    RETURN jsonb_build_object('ok', true, 'free', true, 'remaining', 4 - today_count);
  ELSE
    -- Costs 30 coins
    IF my_coins IS NULL OR my_coins < 30 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins', 'cost', 30);
    END IF;
    UPDATE public.profiles SET coins = coins - 30 WHERE user_id = uid;
    INSERT INTO public.spotter_usage (user_id, usage_date) VALUES (uid, CURRENT_DATE);
    RETURN jsonb_build_object('ok', true, 'free', false, 'cost', 30);
  END IF;
END;
$$;

-- Function to check autospotter status (uses today, premium, etc.)
CREATE OR REPLACE FUNCTION public.get_autospotter_status()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  p_premium boolean;
  p_premium_until timestamptz;
  today_count int;
  my_coins int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('uses_today', 0, 'is_premium', false, 'coins', 0);
  END IF;

  SELECT is_premium, premium_until, coins INTO p_premium, p_premium_until, my_coins
  FROM public.profiles WHERE user_id = uid;

  SELECT COUNT(*) INTO today_count
  FROM public.spotter_usage
  WHERE user_id = uid AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'uses_today', today_count,
    'is_premium', p_premium AND (p_premium_until IS NULL OR p_premium_until > now()),
    'coins', COALESCE(my_coins, 0)
  );
END;
$$;

-- Function to buy premium time (with coins)
CREATE OR REPLACE FUNCTION public.buy_premium_coins(p_plan text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  uid uuid := auth.uid();
  cost int;
  duration interval;
  my_coins int;
  current_until timestamptz;
  new_until timestamptz;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  CASE p_plan
    WHEN 'week' THEN cost := 199; duration := interval '7 days';
    WHEN 'month' THEN cost := 699; duration := interval '30 days';
    WHEN 'year' THEN cost := 7899; duration := interval '365 days';
    ELSE RETURN jsonb_build_object('ok', false, 'error', 'invalid_plan');
  END CASE;

  SELECT coins, premium_until INTO my_coins, current_until
  FROM public.profiles WHERE user_id = uid;

  IF my_coins IS NULL OR my_coins < cost THEN
    RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins');
  END IF;

  -- Extend from current premium_until if still active, otherwise from now
  IF current_until IS NOT NULL AND current_until > now() THEN
    new_until := current_until + duration;
  ELSE
    new_until := now() + duration;
  END IF;

  UPDATE public.profiles
  SET coins = coins - cost,
      is_premium = true,
      premium_until = new_until
  WHERE user_id = uid;

  RETURN jsonb_build_object('ok', true, 'premium_until', new_until::text);
END;
$$;

-- Update claim_daily_boosters to support premium (4h cooldown, max 5)
CREATE OR REPLACE FUNCTION public.claim_daily_boosters()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  r record;
  next_ts timestamptz;
  p_premium boolean;
  p_premium_until timestamptz;
  cooldown_interval interval;
  max_stored int;
BEGIN
  -- Check premium status
  SELECT is_premium, premium_until INTO p_premium, p_premium_until
  FROM public.profiles WHERE user_id = auth.uid();

  IF p_premium AND (p_premium_until IS NULL OR p_premium_until > now()) THEN
    cooldown_interval := interval '4 hours';
    max_stored := 5;
  ELSE
    cooldown_interval := interval '12 hours';
    max_stored := 3;
  END IF;

  SELECT * INTO r FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  IF r IS NULL THEN
    INSERT INTO public.user_booster_cooldown (user_id, stored_count, next_available_at)
    VALUES (auth.uid(), 0, now() + cooldown_interval);
    RETURN jsonb_build_object('stored_count', 0, 'next_available_at', (now() + cooldown_interval)::text, 'max_stored', max_stored);
  END IF;

  next_ts := COALESCE(r.next_available_at, now() + cooldown_interval);
  WHILE now() >= next_ts AND (SELECT stored_count FROM public.user_booster_cooldown WHERE user_id = auth.uid()) < max_stored LOOP
    UPDATE public.user_booster_cooldown
    SET stored_count = LEAST(max_stored, stored_count + 1),
        next_available_at = next_ts + cooldown_interval
    WHERE user_id = auth.uid();
    SELECT next_available_at INTO next_ts FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  END LOOP;

  SELECT stored_count, next_available_at INTO r FROM public.user_booster_cooldown WHERE user_id = auth.uid();
  RETURN jsonb_build_object(
    'stored_count', r.stored_count,
    'next_available_at', r.next_available_at::text,
    'max_stored', max_stored
  );
END;
$$;
