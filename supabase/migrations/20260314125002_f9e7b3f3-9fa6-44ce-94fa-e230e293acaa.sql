
CREATE OR REPLACE FUNCTION public.use_autospotter()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  p_premium boolean;
  p_premium_until timestamptz;
  p_role text;
  today_count int;
  my_coins int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'unauthorized');
  END IF;

  SELECT is_premium, premium_until, coins, role INTO p_premium, p_premium_until, my_coins, p_role
  FROM public.profiles WHERE user_id = uid;

  IF p_role = 'founder' OR (p_premium AND (p_premium_until IS NULL OR p_premium_until > now())) THEN
    INSERT INTO public.spotter_usage (user_id, usage_date) VALUES (uid, CURRENT_DATE);
    RETURN jsonb_build_object('ok', true, 'free', true, 'premium', true);
  END IF;

  SELECT COUNT(*) INTO today_count
  FROM public.spotter_usage
  WHERE user_id = uid AND usage_date = CURRENT_DATE;

  IF today_count < 5 THEN
    INSERT INTO public.spotter_usage (user_id, usage_date) VALUES (uid, CURRENT_DATE);
    RETURN jsonb_build_object('ok', true, 'free', true, 'remaining', 4 - today_count);
  ELSE
    IF my_coins IS NULL OR my_coins < 30 THEN
      RETURN jsonb_build_object('ok', false, 'error', 'insufficient_coins', 'cost', 30);
    END IF;
    UPDATE public.profiles SET coins = coins - 30 WHERE user_id = uid;
    INSERT INTO public.spotter_usage (user_id, usage_date) VALUES (uid, CURRENT_DATE);
    RETURN jsonb_build_object('ok', true, 'free', false, 'cost', 30);
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_autospotter_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  uid uuid := auth.uid();
  p_premium boolean;
  p_premium_until timestamptz;
  p_role text;
  today_count int;
  my_coins int;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('uses_today', 0, 'is_premium', false, 'coins', 0);
  END IF;

  SELECT is_premium, premium_until, coins, role INTO p_premium, p_premium_until, my_coins, p_role
  FROM public.profiles WHERE user_id = uid;

  SELECT COUNT(*) INTO today_count
  FROM public.spotter_usage
  WHERE user_id = uid AND usage_date = CURRENT_DATE;

  RETURN jsonb_build_object(
    'uses_today', today_count,
    'is_premium', p_role = 'founder' OR (p_premium AND (p_premium_until IS NULL OR p_premium_until > now())),
    'coins', COALESCE(my_coins, 0)
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.claim_daily_boosters()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  r record;
  next_ts timestamptz;
  p_premium boolean;
  p_premium_until timestamptz;
  p_role text;
  cooldown_interval interval;
  max_stored int;
BEGIN
  SELECT is_premium, premium_until, role INTO p_premium, p_premium_until, p_role
  FROM public.profiles WHERE user_id = auth.uid();

  IF p_role = 'founder' OR (p_premium AND (p_premium_until IS NULL OR p_premium_until > now())) THEN
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
$function$;
