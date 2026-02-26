-- Achievement XP: each level gives XP (1→100, 2→200, 3→400, 4→800, 5→1500, 6→2000, 7→2500, 8→3000, 9→3500, 10→5000)
-- total_xp = spots_xp + achievement_xp

-- Spotter level from spot count (same thresholds as app)
CREATE OR REPLACE FUNCTION public.spotter_level_from_count(p_count bigint)
RETURNS integer
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  c int := LEAST(2147483647, GREATEST(0, p_count::int));
BEGIN
  IF c >= 20000 THEN RETURN 10; END IF;
  IF c >= 10000 THEN RETURN 9; END IF;
  IF c >= 5000 THEN RETURN 8; END IF;
  IF c >= 2000 THEN RETURN 7; END IF;
  IF c >= 1000 THEN RETURN 6; END IF;
  IF c >= 500 THEN RETURN 5; END IF;
  IF c >= 100 THEN RETURN 4; END IF;
  IF c >= 50 THEN RETURN 3; END IF;
  IF c >= 10 THEN RETURN 2; END IF;
  IF c >= 5 THEN RETURN 1; END IF;
  RETURN 0;
END;
$$;

-- XP rewards per level (1..10)
CREATE OR REPLACE FUNCTION public.achievement_xp_for_level(p_level integer)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  RETURN CASE LEAST(10, GREATEST(0, p_level))
    WHEN 1 THEN 100
    WHEN 2 THEN 200
    WHEN 3 THEN 400
    WHEN 4 THEN 800
    WHEN 5 THEN 1500
    WHEN 6 THEN 2000
    WHEN 7 THEN 2500
    WHEN 8 THEN 3000
    WHEN 9 THEN 3500
    WHEN 10 THEN 5000
    ELSE 0
  END;
END;
$$;

-- Total achievement XP for spotter (sum of rewards 1..level)
CREATE OR REPLACE FUNCTION public.total_achievement_xp_for_spotter(p_spot_count bigint)
RETURNS bigint
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  lvl int;
  total bigint := 0;
  i int;
BEGIN
  lvl := public.spotter_level_from_count(p_spot_count);
  FOR i IN 1..lvl LOOP
    total := total + public.achievement_xp_for_level(i);
  END LOOP;
  RETURN total;
END;
$$;

-- Recompute total_xp = spots_xp + achievement_xp for a user
CREATE OR REPLACE FUNCTION public.recompute_user_total_xp(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  spots_xp bigint;
  spot_count bigint;
  ach_xp bigint;
BEGIN
  SELECT COALESCE(SUM(public.xp_for_car(c.vehicle_type, c.photo_source, c.rarity_rating))::bigint, 0)
  INTO spots_xp
  FROM public.cars c
  WHERE c.user_id = p_user_id;

  SELECT COUNT(*) INTO spot_count
  FROM public.cars c
  WHERE c.user_id = p_user_id AND COALESCE(c.vehicle_type, 'car') != 'hot_wheels';

  ach_xp := public.total_achievement_xp_for_spotter(spot_count);

  UPDATE public.profiles
  SET total_xp = GREATEST(0, spots_xp + ach_xp)
  WHERE user_id = p_user_id;
END;
$$;

-- Trigger: recompute full total_xp (spots + achievements) on car change
CREATE OR REPLACE FUNCTION public.cars_sync_total_xp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    uid := OLD.user_id;
  ELSE
    uid := NEW.user_id;
  END IF;
  PERFORM public.recompute_user_total_xp(uid);
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS cars_sync_total_xp_trigger ON public.cars;
CREATE TRIGGER cars_sync_total_xp_trigger
  AFTER INSERT OR UPDATE OF vehicle_type, photo_source, rarity_rating OR DELETE
  ON public.cars
  FOR EACH ROW
  EXECUTE FUNCTION public.cars_sync_total_xp();

-- Re-backfill so existing users get achievement XP included
SELECT public.recompute_user_total_xp(user_id) FROM public.profiles;
